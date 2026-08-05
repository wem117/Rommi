"""
Telethon MTProto client construction.

Session reuse is the whole point: `TelegramClient(settings.telegram_session_path, ...)`
persists auth to a local SQLite file (roomi_session.session). Once that file
exists and is authenticated, `client.start()` reuses it silently and NEVER
prompts again — prompting only happens the very first time, or if the session
is later revoked. See scripts/create_session.py for that one-time interactive
step, which must be run from a real terminal (phone/code/2FA cannot be
supplied by an automated agent).
"""

from __future__ import annotations

import logging

from telethon import TelegramClient

from app.config import settings

logger = logging.getLogger(__name__)


def build_client() -> TelegramClient:
    return TelegramClient(
        settings.telegram_session_path,
        settings.telegram_api_id,
        settings.telegram_api_hash,
        # Telethon auto-reconnects on transient network drops by default; this
        # just makes the retry cadence explicit rather than relying on defaults.
        connection_retries=10,
        retry_delay=5,
        auto_reconnect=True,
    )


async def connect_or_raise(client: TelegramClient) -> None:
    """
    Connects using the existing session. Raises (rather than prompting) if the
    session is missing or unauthenticated — this service must never attempt an
    interactive login itself; see requirement "Do not fake the session."
    """
    await client.connect()
    if not await client.is_user_authorized():
        raise RuntimeError(
            "Telegram session is not authorized. Run "
            "`python scripts/create_session.py` locally/interactively first — "
            "see telegram-service/README.md."
        )
    logger.info("Telegram session authorized; reusing existing session file")
