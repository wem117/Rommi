"""
Environment configuration for the Telegram -> Roomi import service.

Loaded once at import time from process env (populated by python-dotenv from a
local `.env` in development; from the container's env in production — see
Dockerfile / the deploy workflow). Nothing here has a default for a secret:
missing secrets fail loudly at startup instead of silently running with an
empty credential.

There is deliberately no AI provider in this file any more. Extraction is
deterministic (telegram_parser/), so there is no API key to rotate, no quota to
exhaust and no per-message cost — the three properties that between them cost
this service every listing it received during a Gemini free-tier outage.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing required environment variable {name}. Copy .env.example to "
            f".env and fill in the real value."
        )
    return value


def _optional(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@dataclass(frozen=True, slots=True)
class Settings:
    # --- Telegram MTProto -------------------------------------------------
    telegram_api_id: int
    telegram_api_hash: str
    # Where the .session file lives. Never committed (see repo .gitignore:
    # telegram-service/*.session).
    telegram_session_path: str

    # --- Supabase (same project the Next.js app uses) -----------------------
    # Prefer the internal gateway address when running on the same host as the
    # rest of the stack (see src/lib/supabase/config.ts's `serverUrl` for the
    # identical rationale in the Next.js app); falls back to the public URL.
    supabase_url: str
    supabase_public_url: str
    supabase_service_role_key: str
    supabase_storage_bucket: str

    # --- Parsing / filtering --------------------------------------------------
    # Weighted-signal threshold below which a message is dropped without being
    # written down at all. See telegram_parser/spam_filter.py.
    spam_min_score: int
    # Telegram delivers an album as N separate messages that arrive within a few
    # hundred milliseconds of each other, with the caption on only one of them.
    # This is how long to wait for the rest before treating the group as
    # complete. Too short and photos are lost; too long and the worker holds
    # message objects in memory for no reason.
    album_wait_seconds: float

    # --- Automatic publishing -------------------------------------------------
    # The worker never writes to `listings` itself. When a draft clears the
    # gate it calls the Next.js app, which runs the SAME createListing() /
    # createTemporaryHost() pipeline an admin approval does — so an
    # automatically published listing is byte-for-byte what a hand-approved one
    # would have been. Without these two set, the gate is inert and everything
    # goes to review, which is the correct way to fail.
    app_internal_url: str
    internal_api_secret: str

    # --- Reliability tuning ---------------------------------------------------
    log_level: str
    # A message whose processing failed for a transient reason (Supabase
    # unreachable, storage 5xx) stays unprocessed and is retried on this
    # schedule. The ceiling is minutes rather than the old six HOURS: without an
    # AI provider there is no per-day quota to outlast, and every remaining
    # failure mode is an outage measured in minutes.
    max_process_attempts: int
    retry_base_seconds: float
    retry_max_seconds: float
    retry_sweep_interval_seconds: float
    retry_batch_size: int


def load_settings() -> Settings:
    api_id_raw = _require("TELEGRAM_API_ID")
    try:
        api_id = int(api_id_raw)
    except ValueError as exc:
        raise RuntimeError("TELEGRAM_API_ID must be an integer") from exc

    public_url = _require("NEXT_PUBLIC_SUPABASE_URL").rstrip("/")
    supabase_url = (_optional("SUPABASE_INTERNAL_URL") or public_url).rstrip("/")

    return Settings(
        telegram_api_id=api_id,
        telegram_api_hash=_require("TELEGRAM_API_HASH"),
        telegram_session_path=_optional("TELEGRAM_SESSION_PATH", "roomi_session"),
        supabase_url=supabase_url,
        # Photo URLs are stored in the database and later loaded by a BROWSER,
        # which cannot resolve an internal Docker hostname — so the public
        # origin is kept separately from the one this process talks to.
        supabase_public_url=public_url,
        supabase_service_role_key=_require("SUPABASE_SERVICE_ROLE_KEY"),
        supabase_storage_bucket=_optional("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET", "roommate-assets"),
        app_internal_url=_optional("ROOMI_APP_INTERNAL_URL").rstrip("/"),
        internal_api_secret=_optional("INTERNAL_API_SECRET"),
        spam_min_score=int(_optional("SPAM_MIN_SCORE", "2")),
        album_wait_seconds=float(_optional("ALBUM_WAIT_SECONDS", "2.5")),
        log_level=_optional("LOG_LEVEL", "INFO"),
        max_process_attempts=int(_optional("MAX_PROCESS_ATTEMPTS", "5")),
        retry_base_seconds=float(_optional("RETRY_BASE_SECONDS", "30")),
        retry_max_seconds=float(_optional("RETRY_MAX_SECONDS", "900")),
        retry_sweep_interval_seconds=float(_optional("RETRY_SWEEP_INTERVAL_SECONDS", "300")),
        retry_batch_size=int(_optional("RETRY_BATCH_SIZE", "20")),
    )


settings = load_settings()
