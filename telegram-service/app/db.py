"""
Supabase access for the telegram-service.

Talks to the SAME Supabase project the Next.js app uses (existing
Roomi database — see the task spec), via plain PostgREST/Storage HTTP calls
with the service-role key. Raw HTTP rather than the supabase-py SDK: the
handful of operations needed here (select with equality filters, insert with
on-conflict-do-nothing, update-by-id, a storage upload) are simple enough that
direct REST calls are easier to audit than a SDK's async client version matrix,
and they mirror exactly how the existing Next.js admin routes think about the
same tables.

Every table this module touches (telegram_sources, telegram_messages,
telegram_listings) has RLS enabled with ZERO policies — see
supabase/migrations/20240101002500_telegram_imports.sql. Only the service-role
key (which carries BYPASSRLS) can read or write them, which is exactly what
this service authenticates with.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_REST_HEADERS = {
    "apikey": settings.supabase_service_role_key,
    "Authorization": f"Bearer {settings.supabase_service_role_key}",
    "Content-Type": "application/json",
}


class SupabaseError(RuntimeError):
    """A PostgREST/Storage call returned a non-2xx response."""


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=settings.supabase_url, headers=_REST_HEADERS, timeout=30.0)


async def _raise_for_status(response: httpx.Response, context: str) -> None:
    if response.status_code >= 400:
        raise SupabaseError(f"{context} failed: {response.status_code} {response.text[:500]}")


# --- telegram_sources --------------------------------------------------------


async def get_enabled_sources() -> list[dict[str, Any]]:
    """All sources the worker should currently be listening to."""
    async with _client() as client:
        response = await client.get(
            "/rest/v1/telegram_sources",
            params={"select": "*", "enabled": "eq.true"},
        )
        await _raise_for_status(response, "get_enabled_sources")
        return response.json()


# --- telegram_messages --------------------------------------------------------


async def record_message_if_new(
    source_id: str, telegram_message_id: int, content: str
) -> dict[str, Any] | None:
    """
    Inserts the message row, or returns None if it was already recorded.

    The (telegram_source_id, telegram_message_id) unique constraint is the
    authoritative duplicate guard — this survives a crash-and-restart replay of
    the same events, not just an in-memory "seen" set that a restart would
    forget. `Prefer: resolution=ignore-duplicates` makes the insert a no-op
    instead of a 409 when the row already exists.
    """
    async with _client() as client:
        response = await client.post(
            "/rest/v1/telegram_messages",
            headers={"Prefer": "resolution=ignore-duplicates,return=representation"},
            json={
                "telegram_source_id": source_id,
                "telegram_message_id": telegram_message_id,
                "content": content,
            },
        )
        await _raise_for_status(response, "record_message_if_new")
        rows = response.json()
        return rows[0] if rows else None


async def mark_message_processed(message_id: str) -> None:
    async with _client() as client:
        response = await client.patch(
            "/rest/v1/telegram_messages",
            params={"id": f"eq.{message_id}"},
            json={"processed": True},
        )
        await _raise_for_status(response, "mark_message_processed")


# --- telegram_listings --------------------------------------------------------


async def create_telegram_listing(payload: dict[str, Any]) -> dict[str, Any]:
    async with _client() as client:
        response = await client.post(
            "/rest/v1/telegram_listings",
            headers={"Prefer": "return=representation"},
            json=payload,
        )
        await _raise_for_status(response, "create_telegram_listing")
        return response.json()[0]


# --- Storage ------------------------------------------------------------------


async def upload_photo(path: str, content: bytes, content_type: str) -> str:
    """
    Uploads to the SAME bucket the Next.js app's /api/upload route writes to
    (NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET, default "roommate-assets") — the
    existing storage structure, not a new one. Returns the public URL, built
    the same way src/app/api/upload/route.ts does: re-anchored to the PUBLIC
    Supabase origin even when this service talks to an internal gateway URL,
    because the resulting link is stored in the database and eventually loaded
    by a browser that cannot resolve an internal hostname.
    """
    bucket = settings.supabase_storage_bucket
    async with _client() as client:
        response = await client.post(
            f"/storage/v1/object/{bucket}/{path}",
            headers={"Content-Type": content_type, "x-upsert": "false"},
            content=content,
        )
        await _raise_for_status(response, "upload_photo")

    import os

    public_base = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", settings.supabase_url).rstrip("/")
    return f"{public_base}/storage/v1/object/public/{bucket}/{path}"
