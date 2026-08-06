"""
Telegram -> Roomi listing import worker.

Entry point (also importable — see app/main.py, which runs this as a FastAPI
background task). Can run standalone:

    python telegram_listener.py

The pipeline, in the order a message travels it:

    Telegram message
        -> album reassembly        (app/albums.py — six events, one post)
        -> spam filter             (telegram_parser/spam_filter.py)
        -> deterministic parser    (telegram_parser/parser.py)
        -> photo processing        (app/media.py — streamed, never buffered)
        -> telegram_listings draft (status='pending_review')
        -> admin review            (Admin Panel -> Telegram Imports)
        -> manual approval         (the EXISTING createListing() pipeline)

Nothing is ever published automatically. This worker's only write to a
user-visible table is a draft with status='pending_review'; the transition to a
real listing happens exclusively in the Next.js approve route, behind
requireAdminUser().

Two properties are load-bearing and easy to lose:

  * The spam filter runs BEFORE the first database write. A message that is not
    about housing costs one regex sweep and nothing else — no row, no photo
    download, no storage object, no draft for a human to dismiss.
  * Extraction is deterministic. There is no quota to exhaust, so a failure is
    always about the moment (Supabase unreachable) and never about the message.
    That distinction used to be the difference between a listing and a silent
    data loss: when Gemini's per-day quota ran out, 18 real listings were retried
    eight times each and then retired unseen.

Reliability posture: nothing raised while processing a SINGLE message is allowed
to stop the listener. Telegram unavailability, a malformed message, or a photo
that fails to download are all caught and logged rather than propagated.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from telethon import events, utils
from telethon.errors import FloodWaitError

from app.albums import AlbumBuffer
from app.config import settings
from app.db import (
    SupabaseError,
    close_client,
    create_telegram_listing,
    get_due_messages,
    get_enabled_sources,
    get_source_by_id,
    listing_exists_for_message,
    mark_message_processed,
    record_message_if_new,
    schedule_message_retry,
)
from app.logging_config import configure_logging
from app.media import download_media  # noqa: F401 - re-exported (see module docstring)
from app.telethon_client import build_client, connect_or_raise
from telegram_parser import (
    PARSER_VERSION,
    ParsedListing,
    RecentContentFilter,
    TelegramSender,
    classify,
    normalize_text,
    parse_message,
)

logger = logging.getLogger(__name__)

# Catches an advertiser re-posting identical TEXT under a new message id, which
# the database's (source, message_id) constraint cannot see. Bounded — see
# RecentContentFilter.
_recent_content = RecentContentFilter(capacity=256)


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


# --------------------------------------------------------------------- sender


async def read_sender(message: Any) -> TelegramSender:
    """
    Who posted, as far as Telegram will say.

    Best-effort by design: a channel post has no user sender, a forwarded one
    may have a hidden sender, and `get_sender()` can cost a network round-trip.
    None of that is worth failing an import over, so every field degrades to
    empty independently.
    """
    sender_obj = getattr(message, "sender", None)
    if sender_obj is None:
        try:
            sender_obj = await message.get_sender()
        except Exception:  # noqa: BLE001 - unresolvable sender is not an error
            sender_obj = None

    if sender_obj is None:
        # A channel post signed by its author carries the name and nothing else.
        author = (getattr(message, "post_author", "") or "").strip()
        return TelegramSender(display_name=author)

    first = (getattr(sender_obj, "first_name", "") or "").strip()
    last = (getattr(sender_obj, "last_name", "") or "").strip()
    title = (getattr(sender_obj, "title", "") or "").strip()
    username = (getattr(sender_obj, "username", "") or "").strip()

    # A channel's `title` IS its display name; a user's is assembled from the
    # name parts. Storing the assembled form under a separate key from the parts
    # is deliberate — an admin chasing a poster needs both.
    display = title or " ".join(part for part in (first, last) if part) or username

    telegram_id = getattr(sender_obj, "id", None)
    return TelegramSender(
        telegram_id=telegram_id if isinstance(telegram_id, int) else None,
        username=username,
        first_name=first,
        last_name=last,
        display_name=display,
        is_bot=bool(getattr(sender_obj, "bot", False)),
    )


def _message_payload(
    source_id: str,
    primary: Any,
    group: list[Any],
    sender: TelegramSender,
    content: str,
) -> dict[str, Any]:
    """The `telegram_messages` row: the post exactly as it arrived."""
    sent_at = getattr(primary, "date", None)
    photo_ids = [int(m.id) for m in group if getattr(m, "photo", None) and getattr(m, "id", None)]

    return {
        "telegram_source_id": source_id,
        "telegram_message_id": int(primary.id),
        "content": content,
        "grouped_id": int(primary.grouped_id) if getattr(primary, "grouped_id", None) else None,
        "photo_message_ids": photo_ids,
        "message_date": sent_at.isoformat() if sent_at else None,
        "sender_telegram_id": sender.telegram_id,
        "sender_username": sender.username,
        "sender_first_name": sender.first_name,
        "sender_last_name": sender.last_name,
        "sender_display_name": sender.display_name,
        "sender_is_bot": sender.is_bot,
    }


# ---------------------------------------------------------------------- draft


async def create_draft_listing(
    message_row_id: str,
    parsed: ParsedListing,
    photo_urls: list[str],
) -> dict[str, Any]:
    """
    Persists one parsed listing to telegram_listings with
    status='pending_review', ready for Admin Panel -> Telegram Imports.

    `status` is not a parameter and never will be: this function is the only
    thing in the service that writes to this table, and 'pending_review' is the
    only status it may write. Publishing is a human action taken in the admin
    panel, through the same createListing() pipeline a hand-seeded listing uses.
    """
    draft_id = str(uuid.uuid4())
    payload = parsed.to_draft_payload()
    payload.update(
        {
            "id": draft_id,
            "telegram_message_id": message_row_id,
            "status": "pending_review",
            "photo_urls": photo_urls,
        }
    )

    row = await create_telegram_listing(payload)
    logger.info(
        "Draft listing created",
        extra={
            "draft_id": draft_id,
            "photos": len(photo_urls),
            "price": parsed.price,
            "city": parsed.city,
            "kind": parsed.listing_kind,
            "warnings": len(parsed.warnings),
        },
    )
    return row


def retry_delay_seconds(attempts: int) -> float:
    """Exponential backoff for the Nth failed attempt, capped."""
    if attempts < 1:
        attempts = 1
    delay = settings.retry_base_seconds * (2 ** (attempts - 1))
    return min(delay, settings.retry_max_seconds)


def is_retryable(exc: BaseException) -> bool:
    """
    Whether trying this message again later could plausibly succeed.

    With extraction now deterministic, the answer is decided entirely by
    TRANSPORT: a message that failed to parse will fail identically forever, so
    only Supabase/Storage/network faults are worth queueing. This is a much
    smaller and more honest set than the AI-era version, which had to guess at
    quota semantics from exception text.
    """
    if isinstance(exc, (SupabaseError, TimeoutError, ConnectionError, OSError)):
        return True
    return exc.__class__.__module__.split(".")[0] == "httpx"


# ------------------------------------------------------------------ pipeline


async def _attempt_import(
    message_row_id: str,
    content: str,
    group: list[Any],
    sender: TelegramSender,
    default_city: str,
) -> None:
    """Parse -> photos -> draft, for one message. Raises on a transport fault."""
    if await listing_exists_for_message(message_row_id):
        logger.info(
            "Draft already exists for this message; not creating another",
            extra={"message_row_id": message_row_id},
        )
        return

    # The gate again, because this is a second entrance to the pipeline. A live
    # message was filtered before it was ever written down, but a row reaching
    # here from the RETRY QUEUE may predate the filter entirely — the rows this
    # service accumulated while the AI extractor was failing include 26 textless
    # album members. Parsing one of those produces a draft with nothing in it,
    # which is worse than no draft: it is work for an admin that can only end in
    # a rejection.
    verdict = classify(
        normalize_text(content),
        has_photos=any(getattr(m, "photo", None) for m in group),
        sender_is_bot=sender.is_bot,
        min_score=settings.spam_min_score,
    )
    if not verdict.keep:
        logger.info(
            "Queued message is not a housing post; completing it without a draft",
            extra={"message_row_id": message_row_id, **verdict.as_log_extra()},
        )
        return

    parsed = parse_message(content, sender=sender, default_city=default_city)

    # The draft id is minted here so photos land under the path the draft will
    # reference, and so a retry that got as far as uploading does not orphan the
    # objects it wrote.
    photo_urls = await download_media(group, message_row_id) if group else []

    await create_draft_listing(message_row_id, parsed, photo_urls)


async def _run_attempt(
    message_row: dict[str, Any],
    content: str,
    group: list[Any],
    sender: TelegramSender,
    default_city: str,
) -> None:
    """
    Executes one import attempt and records its outcome durably.

    This is the ONLY place that decides between "done" and "try again later".
    An earlier version marked every message processed in a `finally:`, which
    meant a transient failure retired a perfectly good listing forever.
    """
    message_row_id = message_row["id"]
    attempts = int(message_row.get("attempts") or 0)

    finished, error = True, None
    try:
        await _attempt_import(message_row_id, content, group, sender, default_city)
    except FloodWaitError as exc:
        # Telegram's own rate limit — inherently temporary, so it is a retry,
        # not a completion.
        logger.warning("Telegram flood wait", extra={"seconds": exc.seconds})
        finished, error = False, f"telegram flood wait {exc.seconds}s"
    except Exception as exc:  # noqa: BLE001 - "do not crash on an invalid message"
        if is_retryable(exc):
            logger.warning(
                "Import failed for a transient reason; will retry",
                extra={"message_row_id": message_row_id, "error": str(exc)[:300]},
            )
            finished, error = False, str(exc)[:500]
        else:
            logger.exception("Unhandled error processing message")
            finished, error = True, str(exc)[:500]

    try:
        if finished:
            await mark_message_processed(message_row_id, error)
            return

        attempts += 1
        if attempts >= settings.max_process_attempts:
            logger.error(
                "Giving up on message after repeated transient failures",
                extra={"message_row_id": message_row_id, "attempts": attempts, "error": error},
            )
            await mark_message_processed(message_row_id, f"gave up after {attempts} attempts: {error}")
            return

        delay = retry_delay_seconds(attempts)
        next_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
        logger.info(
            "Message re-queued after a transient failure",
            extra={
                "message_row_id": message_row_id,
                "attempts": attempts,
                "retry_in_seconds": round(delay),
                "next_attempt_at": next_at.isoformat(),
            },
        )
        await schedule_message_retry(message_row_id, attempts, next_at.isoformat(), error or "")
    except Exception:  # noqa: BLE001
        logger.exception("Failed to record message outcome", extra={"message_row_id": message_row_id})


def choose_primary(group: list[Any]) -> tuple[Any, str]:
    """
    The message that carries the post, and its text.

    In an album the caption sits on exactly one member and Telegram does not
    promise which. The one WITH text is the post; if none has any, the
    lowest-numbered member represents the group so the dedup key is stable
    across restarts and re-fetches.
    """
    for message in group:
        text = (getattr(message, "raw_text", None) or getattr(message, "message", None) or "").strip()
        if text:
            return message, text
    return group[0], ""


async def process_group(group: list[Any], source: dict[str, Any]) -> None:
    """
    One post — a single message or a reassembled album — end to end.

    Order matters: the spam verdict is reached before anything is written, so a
    crypto advert costs one regex sweep and leaves no trace in the database.
    """
    if not group:
        return

    source_id = source["id"]
    primary, content = choose_primary(group)
    has_photos = any(getattr(m, "photo", None) for m in group)

    try:
        sender = await read_sender(primary)
    except Exception:  # noqa: BLE001
        sender = TelegramSender()

    verdict = classify(
        normalize_text(content),
        has_photos=has_photos,
        sender_is_bot=sender.is_bot,
        min_score=settings.spam_min_score,
    )
    if not verdict.keep:
        logger.info(
            "Message ignored before any database write",
            extra={
                "source_id": source_id,
                "telegram_message_id": getattr(primary, "id", None),
                "chars": len(content),
                **verdict.as_log_extra(),
            },
        )
        return

    if content and _recent_content.is_repeat(content):
        logger.info(
            "Duplicate post text seen recently; ignored",
            extra={"source_id": source_id, "telegram_message_id": getattr(primary, "id", None)},
        )
        return

    try:
        message_row = await record_message_if_new(
            _message_payload(source_id, primary, group, sender, content)
        )
    except Exception:  # noqa: BLE001 - a DB hiccup must not crash the listener
        logger.exception("Failed to record incoming message", extra={"source_id": source_id})
        return

    if message_row is None:
        # Already recorded in a previous run — the unique constraint is the
        # authoritative guard, not just an in-memory "seen" set.
        return

    logger.info(
        "Recorded incoming message",
        extra={
            "source_id": source_id,
            "message_row_id": message_row["id"],
            "chars": len(content),
            "photos": sum(1 for m in group if getattr(m, "photo", None)),
            "spam_score": verdict.score,
        },
    )
    await _run_attempt(message_row, content, group, sender, source.get("default_city") or "")


async def listen_messages(client) -> AlbumBuffer | None:
    """
    Resolves every enabled telegram_sources row to a Telegram entity and
    registers a single NewMessage handler covering all of them. Sources are
    re-read each time this is called (on startup, and again if the caller
    restarts the listener), so enabling/disabling a source in the admin panel
    takes effect on the next restart without a code change.

    A source whose username can't be resolved (typo, account not a member, chat
    deleted) is logged and skipped rather than aborting startup for every other
    source.

    Returns the album buffer so the caller can shut it down cleanly.
    """
    sources = await get_enabled_sources()
    if not sources:
        logger.warning("No enabled telegram_sources; listener has nothing to watch")
        return None

    entities = []
    entity_to_source: dict[int, str] = {}
    by_id: dict[str, dict[str, Any]] = {}

    for source in sources:
        username = source["telegram_username"]
        try:
            entity = await client.get_entity(username)
        except Exception:  # noqa: BLE001
            logger.exception("Could not resolve source; skipping", extra={"source": username})
            continue
        entities.append(entity)
        by_id[source["id"]] = source
        for key in peer_keys(entity):
            entity_to_source[key] = source["id"]

    if not entities:
        logger.error("No sources could be resolved; listener has nothing to watch")
        return None

    async def flush_album(group: list[Any], source_id: str) -> None:
        source = by_id.get(source_id)
        if source is not None:
            await process_group(group, source)

    buffer = AlbumBuffer(settings.album_wait_seconds, flush_album)

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

        message = event.message
        grouped_id = getattr(message, "grouped_id", None)
        if grouped_id:
            await buffer.add(int(grouped_id), message, source_id)
            return

        source = by_id.get(source_id)
        if source is not None:
            await process_group([message], source)

    logger.info(
        "Listening for new messages",
        extra={"source_count": len(entities), "parser_version": PARSER_VERSION},
    )
    return buffer


# ----------------------------------------------------------------- retry queue


async def _refetch_messages(client, row: dict[str, Any], source: dict[str, Any] | None) -> list[Any]:
    """
    Re-fetches the original Telegram messages so a retry can still collect the
    post's photos — including every member of an album, via the ids recorded
    when the post first arrived.

    Best-effort by design: the messages may have been deleted, or the chat may
    no longer resolve. A draft with no photos is worth far more than no draft,
    so a failure here downgrades the retry to text-only rather than aborting it.
    """
    wanted = list(row.get("photo_message_ids") or [])
    if int(row["telegram_message_id"]) not in wanted:
        wanted.append(int(row["telegram_message_id"]))

    if source is None:
        return []

    try:
        entity = await client.get_entity(source["telegram_username"])
        messages = await client.get_messages(entity, ids=wanted)
    except Exception:  # noqa: BLE001
        logger.warning(
            "Could not re-fetch original message; retrying text-only",
            extra={"message_row_id": row.get("id")},
        )
        return []

    found = [m for m in (messages or []) if m is not None]

    # Recovery for rows recorded before photo_message_ids existed: the stored id
    # is the caption's, and its album siblings were never written down. The
    # fetched message still knows its grouped_id, and Telegram numbers album
    # members consecutively — so one bounded scan of the neighbouring ids
    # reassembles the post. Without this every backfilled draft arrives with one
    # photo out of however many the poster attached.
    if len(found) == 1 and len(wanted) == 1:
        found = await _recover_album_siblings(client, entity, found[0])

    return found


# Telegram caps an album at 10 messages, so a window of 10 either side reaches
# every sibling regardless of where the caption sits in the group.
ALBUM_ID_WINDOW = 10


async def _recover_album_siblings(client, entity, message: Any) -> list[Any]:
    """The album `message` belongs to, or just `message` if it is not in one."""
    grouped_id = getattr(message, "grouped_id", None)
    if not grouped_id:
        return [message]

    primary_id = int(message.id)
    window = [
        candidate
        for candidate in range(primary_id - ALBUM_ID_WINDOW, primary_id + ALBUM_ID_WINDOW + 1)
        if candidate > 0 and candidate != primary_id
    ]

    try:
        siblings = await client.get_messages(entity, ids=window)
    except Exception:  # noqa: BLE001 - the caption alone is still a usable draft
        logger.warning("Could not scan for album siblings", extra={"message_id": primary_id})
        return [message]

    group = [message]
    group.extend(
        sibling
        for sibling in (siblings or [])
        if sibling is not None and getattr(sibling, "grouped_id", None) == grouped_id
    )
    group.sort(key=lambda m: getattr(m, "id", 0))
    if len(group) > 1:
        logger.info(
            "Recovered album siblings for a queued message",
            extra={"message_id": primary_id, "album_size": len(group)},
        )
    return group


async def sweep_retries(client) -> int:
    """
    Processes one batch of messages whose import failed transiently and whose
    backoff has elapsed. Returns how many were attempted.

    This is what makes a Supabase outage self-healing: nothing needs to re-post
    to Telegram, and no operator has to replay anything by hand.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        due = await get_due_messages(settings.retry_batch_size, now_iso)
    except Exception:  # noqa: BLE001
        logger.exception("Could not load the retry queue")
        return 0

    if not due:
        return 0

    logger.info("Retrying messages that failed earlier", extra={"count": len(due)})

    # One lookup per SOURCE, not per message. A batch is typically twenty rows
    # from the same two or three channels, and this path used to fetch the
    # source row twice for every one of them.
    sources: dict[str, dict[str, Any] | None] = {}

    for row in due:
        source_id = row["telegram_source_id"]
        if source_id not in sources:
            sources[source_id] = await get_source_by_id(source_id)
        source = sources[source_id]

        group = await _refetch_messages(client, row, source)
        sender = TelegramSender(
            telegram_id=row.get("sender_telegram_id"),
            username=row.get("sender_username") or "",
            first_name=row.get("sender_first_name") or "",
            last_name=row.get("sender_last_name") or "",
            display_name=row.get("sender_display_name") or "",
            is_bot=bool(row.get("sender_is_bot")),
        )
        source = await get_source_by_id(row["telegram_source_id"])
        await _run_attempt(
            row,
            (row.get("content") or "").strip(),
            group,
            sender,
            (source or {}).get("default_city") or "",
        )
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


# --------------------------------------------------------------------- runtime

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
    """
    backoff = 5
    while True:
        client = build_client()
        buffer: AlbumBuffer | None = None
        try:
            await connect_or_raise(client)
            _status.update(state="connected", detail=None)
            buffer = await listen_messages(client)

            # Drain anything left queued by a previous connection (an outage
            # that spanned a restart) before settling into the periodic sweep,
            # so recovery does not wait out a full interval first.
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
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("Telegram listener crashed; restarting after backoff")
            _status.update(state="error", detail=str(exc)[:300])
        finally:
            if buffer is not None:
                await buffer.close()
            try:
                await client.disconnect()
            except Exception:  # noqa: BLE001
                pass

        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 300)


def main() -> None:
    configure_logging()
    logger.info("Starting Roomi telegram-service", extra={"parser_version": PARSER_VERSION})

    async def _run() -> None:
        # Closing INSIDE the same loop that created the client. An
        # asyncio.run() of its own would hand httpx a different event loop
        # from the one its sockets are bound to, and shutdown would raise on
        # the way out.
        try:
            await run_forever()
        finally:
            await close_client()

    asyncio.run(_run())


if __name__ == "__main__":
    main()
