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
invalid/empty message, or a photo that fails to download are all caught,
logged, and the message is marked processed so it is not retried forever —
its raw content stays in telegram_messages for manual follow-up either way.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from telethon import events
from telethon.errors import FloodWaitError

from app.config import settings
from app.db import (
    create_telegram_listing,
    get_enabled_sources,
    mark_message_processed,
    record_message_if_new,
)
from app.extraction import ExtractionResult, extract_listing  # noqa: F401 - re-exported
from app.logging_config import configure_logging
from app.media import download_media  # noqa: F401 - re-exported
from app.telethon_client import build_client, connect_or_raise

logger = logging.getLogger(__name__)


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


async def _process_message(event: events.NewMessage.Event, source_id: str) -> None:
    message = event.message
    content = (message.raw_text or message.message or "").strip()

    try:
        message_row = await record_message_if_new(source_id, message.id, content)
    except Exception:  # noqa: BLE001 - a DB hiccup must not crash the listener
        logger.exception("Failed to record incoming message", extra={"source_id": source_id})
        return

    if message_row is None:
        # Already processed in a previous run — the unique constraint is the
        # authoritative guard, this is not just an in-memory dedup cache.
        return

    try:
        if not content:
            logger.info("Skipping message with no text", extra={"source_id": source_id})
            return

        result = await extract_listing(content)

        if result.validated is None or not result.validated.is_rental_listing:
            if result.validated is None:
                logger.warning(
                    "Extraction failed; recording error, no draft created",
                    extra={"source_id": source_id, "error": result.error},
                )
            return

        photo_urls = await download_media(message, str(uuid.uuid4()))
        await create_draft_listing(message_row["id"], result, photo_urls)

    except FloodWaitError as exc:
        # Telegram's own rate limit. Telethon already waits this out for
        # client-level calls; surfaced here only so it's visible in logs.
        logger.warning("Telegram flood wait", extra={"seconds": exc.seconds, "source_id": source_id})
    except Exception:  # noqa: BLE001 - "do not crash if ... invalid message"
        logger.exception("Unhandled error processing message", extra={"source_id": source_id})
    finally:
        try:
            await mark_message_processed(message_row["id"])
        except Exception:  # noqa: BLE001
            logger.exception("Failed to mark message processed", extra={"source_id": source_id})


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
        entity_to_source[entity.id] = source["id"]

    if not entities:
        logger.error("No sources could be resolved; listener has nothing to watch")
        return

    @client.on(events.NewMessage(chats=entities))
    async def _handler(event: events.NewMessage.Event) -> None:  # noqa: ANN001
        source_id = entity_to_source.get(event.chat_id)
        if source_id is None:
            return
        await _process_message(event, source_id)

    logger.info("Listening for new messages", extra={"source_count": len(entities)})


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
            await listen_messages(client)
            await client.run_until_disconnected()
            backoff = 5  # reset after a clean run
        except Exception:  # noqa: BLE001
            logger.exception("Telegram listener crashed; restarting after backoff")
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
