"""
Telegram -> AI -> Roomi listing import worker.

Entry point (also importable — see app/main.py, which runs this as a FastAPI
background task). Can run standalone:

    python telegram_listener.py

Required functions (per spec), each independently testable:
    listen_messages()      registers Telethon handlers for every enabled source
    extract_listing()      re-exported from app.extraction — AI text extraction
    download_media()       re-exported from app.media — Telegram photo -> Storage
    create_draft_listing() writes the reviewed-later row to telegram_listings

Reliability posture: nothing raised while processing a SINGLE message is
allowed to stop the listener. Telegram unavailability, an AI failure, an
invalid/empty message, or a photo that fails to download are all caught and
logged rather than propagated.

What happens to the message afterwards depends on WHY it failed:

  * Permanent (no text, unparseable AI output, not a rental listing) — marked
    processed. Retrying cannot change the outcome, and replaying it would burn
    quota that a recoverable message needs.
  * Retryable (Gemini quota/429, model overloaded, network blip, Telegram
    flood wait) — left UNPROCESSED with `attempts`/`next_attempt_at` set, and
    picked up again by sweep_retries() once the backoff elapses. This survives
    a container restart because the state lives in the database, not in memory.

That distinction is the fix for a real data-loss bug: the previous version
marked every message processed in a `finally:` block, so a Gemini quota outage
silently retired every listing that arrived during it — no error, no draft, and
nothing to indicate anything had been lost.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from telethon import events, utils
from telethon.errors import FloodWaitError

from app.config import settings
from app.db import (
    create_telegram_listing,
    get_due_messages,
    get_enabled_sources,
    get_source_by_id,
    listing_exists_for_message,
    mark_message_processed,
    record_message_if_new,
    schedule_message_retry,
)
from app.extraction import ExtractionResult, extract_listing  # noqa: F401 - re-exported
from app.logging_config import configure_logging
from app.media import download_media  # noqa: F401 - re-exported
from app.telethon_client import build_client, connect_or_raise

logger = logging.getLogger(__name__)


def peer_keys(entity: Any) -> set[int]:
    """
    Every id form an incoming event might identify `entity` by.

    Telethon has two representations of the same chat. `entity.id` is the RAW
    id (1582935843); `utils.get_peer_id()` returns the MARKED id
    (-1001582935843), and the marked form is what `event.chat_id` reports.
    They differ for channels and supergroups, coincide for users, and negate
    for legacy groups.

    Registering the routing table under BOTH is what stops a message from being
    dropped because the two disagree — see test_peer_routing.py. Normalising to
    one canonical form would work too, but only until some other call site
    reaches for the other one; carrying both makes the lookup total.
    """
    keys: set[int] = set()
    try:
        keys.add(utils.get_peer_id(entity))
    except (TypeError, ValueError):  # not a peer-like object
        pass
    raw = getattr(entity, "id", None)
    if isinstance(raw, int):
        keys.add(raw)
    return keys


def resolve_source_id(entity_to_source: dict[int, str], chat_id: int | None) -> str | None:
    """
    Looks up the source a message belongs to, tolerating either id form.

    The direct hit covers everything `peer_keys()` registered. The
    `utils.resolve_id()` fallback covers a marked id whose entity was never
    seen in raw form, so a future Telethon that reports a peer differently
    degrades to "still routed" rather than "silently ignored".
    """
    if chat_id is None:
        return None

    source_id = entity_to_source.get(chat_id)
    if source_id is not None:
        return source_id

    try:
        raw_id, _ = utils.resolve_id(chat_id)
    except (TypeError, ValueError):
        return None
    return entity_to_source.get(raw_id)


async def create_draft_listing(
    message_row_id: str,
    result: ExtractionResult,
    photo_urls: list[str],
) -> dict[str, Any]:
    """
    Persists one AI-extracted listing to telegram_listings with
    status='pending_review', ready for Admin Panel -> Telegram Imports.

    Always succeeds in the sense of writing SOMETHING: even a failed
    extraction is recorded (with `extraction_error` set and blank fields) so a
    message that looked like a listing but couldn't be parsed is still visible
    to a human instead of silently disappearing.
    """
    draft_id = str(uuid.uuid4())
    validated = result.validated

    payload: dict[str, Any] = {
        "id": draft_id,
        "telegram_message_id": message_row_id,
        "status": "pending_review",
        "raw_ai_output": result.raw_output,
        "extraction_error": result.error,
        "photo_urls": photo_urls,
    }

    if validated is not None:
        payload.update(
            {
                "title": validated.title,
                "description": validated.description,
                "city": validated.city,
                "district": validated.district,
                "address": validated.address,
                "price": validated.price,
                "currency": validated.currency,
                "rooms": validated.rooms,
                "property_type": validated.property_type,
                "area": validated.area,
                "floor": validated.floor,
                "total_floors": validated.total_floors,
                "amenities": validated.amenities,
                "contact_phone": validated.contact_phone,
                "contact_telegram": validated.contact_telegram,
                "contact_whatsapp": validated.contact_whatsapp,
            }
        )

    row = await create_telegram_listing(payload)
    logger.info(
        "Draft listing created",
        extra={"draft_id": draft_id, "has_error": bool(result.error), "photos": len(photo_urls)},
    )
    return row


def retry_delay_seconds(attempts: int) -> float:
    """
    Exponential backoff for the Nth failed attempt, capped.

    The cap is what matters here: the failure this queue exists for is a
    per-day Gemini quota, so unbounded doubling would overshoot the window that
    the quota actually resets in and leave listings sitting for days.
    """
    if attempts < 1:
        attempts = 1
    delay = settings.retry_base_seconds * (2 ** (attempts - 1))
    return min(delay, settings.retry_max_seconds)


async def _attempt_extraction(
    message_row_id: str,
    content: str,
    message: Any | None,
) -> tuple[bool, str | None]:
    """
    Runs AI extraction for one message and writes the draft when it yields one.

    Returns `(finished, error)`. `finished=False` means the failure was about
    the moment rather than the message — the caller must leave it queued.
    """
    if not content:
        return True, "message has no text"

    result = await extract_listing(content)

    if result.retryable:
        # Quota/transport failure: say nothing permanent about this message.
        return False, result.error

    if result.validated is None:
        logger.warning(
            "Extraction failed permanently; no draft created",
            extra={"message_row_id": message_row_id, "error": result.error},
        )
        return True, result.error

    if not result.validated.is_rental_listing:
        return True, None

    # A message can reach here twice (re-queued after a partial failure), and
    # telegram_listings has no unique constraint on telegram_message_id because
    # a message legitimately may produce no draft at all.
    if await listing_exists_for_message(message_row_id):
        logger.info("Draft already exists for this message; not creating another",
                    extra={"message_row_id": message_row_id})
        return True, None

    photo_urls = await download_media(message, str(uuid.uuid4())) if message is not None else []
    await create_draft_listing(message_row_id, result, photo_urls)
    return True, None


async def _run_attempt(message_row: dict[str, Any], content: str, message: Any | None) -> None:
    """
    Executes one extraction attempt and records its outcome durably.

    This is the ONLY place that decides between "done" and "try again later".
    The previous version marked every message processed in a `finally:`, which
    meant a Gemini 429 retired a perfectly good listing forever.
    """
    message_row_id = message_row["id"]
    attempts = int(message_row.get("attempts") or 0)

    try:
        finished, error = await _attempt_extraction(message_row_id, content, message)
    except FloodWaitError as exc:
        # Telegram's own rate limit — inherently temporary, so it is a retry,
        # not a completion.
        logger.warning("Telegram flood wait", extra={"seconds": exc.seconds})
        finished, error = False, f"telegram flood wait {exc.seconds}s"
    except Exception as exc:  # noqa: BLE001 - "do not crash if ... invalid message"
        logger.exception("Unhandled error processing message")
        finished, error = True, str(exc)[:500]

    try:
        if finished:
            await mark_message_processed(message_row_id, error)
            return

        attempts += 1
        if attempts >= settings.max_extraction_attempts:
            logger.error(
                "Giving up on message after repeated retryable failures",
                extra={"message_row_id": message_row_id, "attempts": attempts, "error": error},
            )
            await mark_message_processed(
                message_row_id, f"gave up after {attempts} attempts: {error}"
            )
            return

        delay = retry_delay_seconds(attempts)
        next_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
        logger.info(
            "Message re-queued after a retryable AI failure",
            extra={
                "message_row_id": message_row_id,
                "attempts": attempts,
                "retry_in_seconds": round(delay),
                "next_attempt_at": next_at.isoformat(),
                "error": (error or "")[:200],
            },
        )
        await schedule_message_retry(message_row_id, attempts, next_at.isoformat(), error or "")
    except Exception:  # noqa: BLE001
        logger.exception("Failed to record message outcome", extra={"message_row_id": message_row_id})


async def _process_message(event: events.NewMessage.Event, source_id: str) -> None:
    message = event.message
    content = (message.raw_text or message.message or "").strip()

    try:
        message_row = await record_message_if_new(source_id, message.id, content)
    except Exception:  # noqa: BLE001 - a DB hiccup must not crash the listener
        logger.exception("Failed to record incoming message", extra={"source_id": source_id})
        return

    if message_row is None:
        # Already recorded in a previous run — the unique constraint is the
        # authoritative guard, this is not just an in-memory dedup cache.
        return

    logger.info(
        "Recorded incoming message",
        extra={"source_id": source_id, "message_row_id": message_row["id"], "chars": len(content)},
    )
    await _run_attempt(message_row, content, message)


async def listen_messages(client) -> None:
    """
    Resolves every enabled telegram_sources row to a Telegram entity and
    registers a single NewMessage handler covering all of them. Sources are
    re-read each time this is called (on startup, and again if the caller
    restarts the listener), so enabling/disabling a source in the admin panel
    takes effect on the next restart without a code change.

    A source whose username can't be resolved (typo, bot not a member, chat
    deleted) is logged and skipped rather than aborting startup for every
    other source.
    """
    sources = await get_enabled_sources()
    if not sources:
        logger.warning("No enabled telegram_sources; listener has nothing to watch")
        return

    entities = []
    entity_to_source: dict[int, str] = {}

    for source in sources:
        username = source["telegram_username"]
        try:
            entity = await client.get_entity(username)
        except Exception:  # noqa: BLE001
            logger.exception("Could not resolve source; skipping", extra={"source": username})
            continue
        entities.append(entity)
        for key in peer_keys(entity):
            entity_to_source[key] = source["id"]

    if not entities:
        logger.error("No sources could be resolved; listener has nothing to watch")
        return

    @client.on(events.NewMessage(chats=entities))
    async def _handler(event: events.NewMessage.Event) -> None:  # noqa: ANN001
        source_id = resolve_source_id(entity_to_source, event.chat_id)
        if source_id is None:
            # Previously a bare `return`. That silence is exactly what hid the
            # id-form mismatch this function now guards against: the listener
            # reported "connected", logged nothing, and discarded every message
            # for days. An unroutable message must be audible.
            logger.warning(
                "Message from an unregistered peer; ignoring",
                extra={"chat_id": event.chat_id, "known_peers": len(entity_to_source)},
            )
            return
        await _process_message(event, source_id)

    logger.info("Listening for new messages", extra={"source_count": len(entities)})


async def _refetch_message(client, row: dict[str, Any]) -> Any | None:
    """
    Re-fetches the original Telegram message so a retry can still collect its
    photos.

    Best-effort by design: the message may have been deleted, or the chat may no
    longer resolve. A draft with no photos is worth far more than no draft, so a
    failure here downgrades the retry to text-only rather than aborting it.
    """
    try:
        source = await get_source_by_id(row["telegram_source_id"])
        if source is None:
            return None
        entity = await client.get_entity(source["telegram_username"])
        messages = await client.get_messages(entity, ids=[int(row["telegram_message_id"])])
    except Exception:  # noqa: BLE001
        logger.warning(
            "Could not re-fetch original message; retrying text-only",
            extra={"message_row_id": row.get("id")},
        )
        return None

    if not messages:
        return None
    return messages[0]


async def sweep_retries(client) -> int:
    """
    Processes one batch of messages whose extraction failed retryably and whose
    backoff has elapsed. Returns how many were attempted.

    This is what makes a quota outage self-healing: nothing needs to re-post to
    Telegram, and no operator has to replay anything by hand.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        due = await get_due_messages(settings.retry_batch_size, now_iso)
    except Exception:  # noqa: BLE001
        logger.exception("Could not load the retry queue")
        return 0

    if not due:
        return 0

    logger.info("Retrying messages whose extraction failed earlier", extra={"count": len(due)})
    for row in due:
        message = await _refetch_message(client, row)
        await _run_attempt(row, (row.get("content") or "").strip(), message)
    return len(due)


async def run_retry_sweeper(client) -> None:
    """Periodic drain of the retry queue, for the lifetime of one connection."""
    while True:
        await asyncio.sleep(settings.retry_sweep_interval_seconds)
        try:
            await sweep_retries(client)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - a bad sweep must not end the loop
            logger.exception("Retry sweep failed; will try again next interval")


# Real Telegram connection state, distinct from "the supervisor asyncio task
# is alive". The task is DESIGNED to never die (that's the whole point of
# run_forever()'s catch-log-backoff-retry loop), so "is the task still
# running" is always true even while every connection attempt is failing for
# want of a session — that would make /health report "running" whether or not
# Telegram is actually reachable. This dict is the single source of truth
# app/main.py's /health endpoint reads instead.
_status: dict[str, str | None] = {"state": "starting", "detail": None}


def get_listener_status() -> dict[str, str | None]:
    return dict(_status)


async def run_forever() -> None:
    """
    Supervisor loop: (re)connects, listens, and — if the client ever
    disconnects unexpectedly or an unhandled error escapes the handler
    registration itself — waits and restarts, rather than exiting the process.
    Satisfies "Do not crash if: Telegram unavailable".
    """
    backoff = 5
    while True:
        client = build_client()
        try:
            await connect_or_raise(client)
            _status.update(state="connected", detail=None)
            await listen_messages(client)

            # Drain anything left queued by a previous connection (a quota
            # outage that spanned a restart) before settling into the periodic
            # sweep, so recovery does not wait out a full interval first.
            await sweep_retries(client)

            sweeper = asyncio.create_task(run_retry_sweeper(client))
            try:
                await client.run_until_disconnected()
            finally:
                sweeper.cancel()
                try:
                    await sweeper
                except (asyncio.CancelledError, Exception):  # noqa: BLE001
                    pass

            _status.update(state="disconnected", detail="client.run_until_disconnected() returned")
            backoff = 5  # reset after a clean run
        except Exception as exc:  # noqa: BLE001
            logger.exception("Telegram listener crashed; restarting after backoff")
            _status.update(state="error", detail=str(exc)[:300])
        finally:
            try:
                await client.disconnect()
            except Exception:  # noqa: BLE001
                pass

        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 300)


def main() -> None:
    configure_logging()
    logger.info("Starting Roomi telegram-service", extra={"model": settings.gemini_model})
    asyncio.run(run_forever())


if __name__ == "__main__":
    main()
