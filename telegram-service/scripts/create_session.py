"""
One-time interactive Telegram login.

Run this yourself, from a real terminal, exactly once:

    cd telegram-service
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env   # then fill in TELEGRAM_API_ID / TELEGRAM_API_HASH
    python scripts/create_session.py

It will prompt for:
  1. Your phone number (international format, e.g. +7700...)
  2. The login code Telegram sends you
  3. Your 2FA password, ONLY if you have two-step verification enabled

On success it writes roomi_session.session next to this script's parent
directory (telegram-service/roomi_session.session) and prints a confirmation.
That file is gitignored (see repo .gitignore: telegram-service/*.session) and
must never be committed — copy it to wherever the worker actually runs
(production host / container volume) instead of re-running this script there.

Running telegram_listener.py or the FastAPI app WITHOUT first creating this
session will raise a clear error rather than attempting to log in itself —
this script is the only place that ever asks for a phone/code/2FA password.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from telethon import TelegramClient  # noqa: E402

from app.config import settings  # noqa: E402


async def main() -> None:
    client = TelegramClient(settings.telegram_session_path, settings.telegram_api_id, settings.telegram_api_hash)

    # client.start() is Telethon's standard interactive flow: it prompts for
    # phone/code/2FA on stdin ONLY if the session file doesn't already contain
    # a valid, authorized session. Running this a second time against an
    # already-authenticated session is a safe no-op.
    await client.start()

    me = await client.get_me()
    print(f"\nSuccessfully authenticated as: {me.first_name} (id={me.id})")
    print(f"Session saved to: {settings.telegram_session_path}.session")
    print("You will NOT be asked to log in again — the worker reuses this file.")

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
