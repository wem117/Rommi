"""
Environment configuration for the Telegram -> AI -> Roomi import service.

Loaded once at import time from process env (populated by python-dotenv from a
local `.env` in development; from the container's env in production — see
Dockerfile / docker-compose.yml). Nothing here has a default for a secret:
missing secrets fail loudly at startup instead of silently running with an
empty credential.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

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


@dataclass(frozen=True)
class Settings:
    # --- Telegram MTProto -------------------------------------------------
    telegram_api_id: int
    telegram_api_hash: str
    # Where the .session file lives. Never committed (see repo .gitignore:
    # telegram-service/*.session).
    telegram_session_path: str

    # --- AI extraction ------------------------------------------------------
    gemini_api_key: str
    gemini_model: str

    # --- Supabase (same project the Next.js app uses) -----------------------
    # Prefer the internal gateway address when running on the same host as the
    # rest of the stack (see src/lib/supabase/config.ts's `serverUrl` for the
    # identical rationale in the Next.js app); falls back to the public URL.
    supabase_url: str
    supabase_service_role_key: str
    supabase_storage_bucket: str

    # --- Reliability tuning ---------------------------------------------------
    # Per-message processing timeout guard and a floor between AI calls so a
    # burst of messages cannot blow through Gemini's rate limit.
    ai_min_interval_seconds: float
    max_retries: int
    log_level: str

    extra: dict = field(default_factory=dict)


def load_settings() -> Settings:
    api_id_raw = _require("TELEGRAM_API_ID")
    try:
        api_id = int(api_id_raw)
    except ValueError as exc:
        raise RuntimeError("TELEGRAM_API_ID must be an integer") from exc

    supabase_url = _optional("SUPABASE_INTERNAL_URL") or _require("NEXT_PUBLIC_SUPABASE_URL")

    return Settings(
        telegram_api_id=api_id,
        telegram_api_hash=_require("TELEGRAM_API_HASH"),
        telegram_session_path=_optional("TELEGRAM_SESSION_PATH", "roomi_session"),
        gemini_api_key=_require("GEMINI_API_KEY"),
        gemini_model=_optional("GEMINI_MODEL", "gemini-2.0-flash"),
        supabase_url=supabase_url.rstrip("/"),
        supabase_service_role_key=_require("SUPABASE_SERVICE_ROLE_KEY"),
        supabase_storage_bucket=_optional("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET", "roommate-assets"),
        ai_min_interval_seconds=float(_optional("AI_MIN_INTERVAL_SECONDS", "1.0")),
        max_retries=int(_optional("MAX_RETRIES", "3")),
        log_level=_optional("LOG_LEVEL", "INFO"),
    )


settings = load_settings()
