"""
Telethon MTProto client construction, and where its credential comes from.

TWO SOURCES, IN ORDER
---------------------
 1. `telegram_sessions` in the database, uploaded through Admin -> Telegram.
 2. The `.session` file on the mounted volume.

The database comes first because the file was the problem. A session file
installed by hand over SSH is invisible from the admin panel: nobody could see
whether it was authorised, when it last spoke to Telegram, or which account it
belonged to, and replacing it meant a shell and a container restart. That is a
poor way to run the single most operationally important credential in the
service.

The file is still supported, and deliberately so: an existing deployment keeps
working untouched after this change, and a database that cannot be reached is
not a reason to stop reconnecting to Telegram.

Session reuse is the whole point either way. Once a session is authenticated,
`connect()` reuses it silently and NEVER prompts again — prompting only happens
the very first time (scripts/create_session.py, from a real terminal), or if the
session is later revoked.
"""

from __future__ import annotations

import logging
from typing import Any

from telethon import TelegramClient
from telethon.sessions import StringSession

from app.config import settings
from app.db import get_active_session, report_session_status

logger = logging.getLogger(__name__)

# Which session the current client was built from, so status can be reported
# back against the right row. None means the file on disk is in use.
_active_session_id: str | None = None


def active_session_id() -> str | None:
    return _active_session_id


async def resolve_session() -> Any:
    """
    The session to hand Telethon: a StringSession from the database, or the
    file path.

    A database failure is logged and falls through to the file rather than
    raising. Reconnecting with the credential we already have is strictly
    better than not reconnecting at all.
    """
    global _active_session_id

    try:
        row = await get_active_session()
    except Exception:  # noqa: BLE001 - the file is a perfectly good fallback
        logger.warning("Could not read the session table; falling back to the session file")
        row = None

    if row and row.get("session_string"):
        _active_session_id = row["id"]
        logger.info(
            "Using the session configured in the admin panel",
            extra={"session_id": row["id"], "label": row.get("label", "")},
        )
        return StringSession(row["session_string"])

    _active_session_id = None
    logger.info("Using the session file", extra={"path": settings.telegram_session_path})
    return settings.telegram_session_path


async def build_client_async() -> TelegramClient:
    return TelegramClient(
        await resolve_session(),
        settings.telegram_api_id,
        settings.telegram_api_hash,
        # Telethon auto-reconnects on transient network drops by default; this
        # just makes the retry cadence explicit rather than relying on defaults.
        connection_retries=10,
        retry_delay=5,
        auto_reconnect=True,
    )


def build_client() -> TelegramClient:
    """
    Synchronous construction from the session FILE.

    Kept for scripts and tests that have no event loop to await on. The worker
    itself uses build_client_async(), which can consult the database.
    """
    return TelegramClient(
        settings.telegram_session_path,
        settings.telegram_api_id,
        settings.telegram_api_hash,
        connection_retries=10,
        retry_delay=5,
        auto_reconnect=True,
    )


async def connect_or_raise(client: TelegramClient) -> None:
    """
    Connects using the existing session. Raises (rather than prompting) if the
    session is missing or unauthenticated — this service must never attempt an
    interactive login itself.

    On success it reports back WHICH Telegram account answered. That is the
    check an operator actually wants after uploading a session: not "did it
    connect" but "did it connect as the account I meant".
    """
    await client.connect()
    if not await client.is_user_authorized():
        await _report("unauthorized", "session file exists but is not authorized")
        raise RuntimeError(
            "Telegram session is not authorized. Upload one from Admin -> Telegram, "
            "or run `python scripts/create_session.py` locally — see telegram-service/README.md."
        )

    account: dict[str, Any] = {}
    try:
        me = await client.get_me()
        if me is not None:
            first = (getattr(me, "first_name", "") or "").strip()
            last = (getattr(me, "last_name", "") or "").strip()
            account = {
                "username": (getattr(me, "username", "") or "").strip(),
                "display_name": " ".join(part for part in (first, last) if part),
                "telegram_id": getattr(me, "id", None),
            }
    except Exception:  # noqa: BLE001 - identifying the account is a nicety
        logger.debug("Could not read the connected account's identity")

    logger.info("Telegram session authorized", extra={"account": account.get("username", "")})
    await _report("connected", "", account)


async def report_heartbeat(status: str = "connected", detail: str = "") -> None:
    """
    Records that the credential is still working.

    The liveness signal an operator needs is not "is the container up" — that
    stayed true for days while a session was silently unusable — but "when did
    this credential last succeed at talking to Telegram".
    """
    await _report(status, detail)


async def _report(status: str, detail: str = "", account: dict[str, Any] | None = None) -> None:
    """Best-effort status write. Never allowed to break the connection path."""
    if _active_session_id is None:
        return
    try:
        await report_session_status(_active_session_id, status, detail, account)
    except Exception:  # noqa: BLE001
        logger.debug("Could not record session status")
