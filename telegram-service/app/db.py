"""
Supabase access for the telegram-service.

Talks to the SAME Supabase project the Next.js app uses via plain
PostgREST/Storage HTTP calls with the service-role key. Raw HTTP rather than the
supabase-py SDK: the handful of operations needed here (select with equality
filters, insert with on-conflict-do-nothing, update-by-id, a storage upload) are
simple enough that direct REST calls are easier to audit than an SDK's async
client version matrix, and they mirror exactly how the existing Next.js admin
routes think about the same tables.

ONE client, for the life of the process. The previous version built a fresh
`httpx.AsyncClient` per call — a new connection pool, a new TLS handshake and a
new set of buffers for every message, every retry sweep and every photo. On a
512 MB container watching four channels that is pure waste: connections are
pooled and keep-alive'd here instead, which is both less memory and fewer
round-trips.

Every table this module touches (telegram_sources, telegram_messages,
telegram_listings) has RLS enabled with ZERO policies — see
supabase/migrations/20240101002500_telegram_imports.sql. Only the service-role
key (which carries BYPASSRLS) can read or write them, which is exactly what
this service authenticates with.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, BinaryIO

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_REST_HEADERS = {
    "apikey": settings.supabase_service_role_key,
    "Authorization": f"Bearer {settings.supabase_service_role_key}",
    "Content-Type": "application/json",
}

# Small on purpose. This worker issues a handful of sequential requests per
# message; a large pool would reserve buffers it never uses.
_LIMITS = httpx.Limits(max_connections=8, max_keepalive_connections=4, keepalive_expiry=60.0)

_client: httpx.AsyncClient | None = None
_client_lock = asyncio.Lock()


class SupabaseError(RuntimeError):
    """A PostgREST/Storage call returned a non-2xx response."""


async def get_client() -> httpx.AsyncClient:
    """
    The process-wide Supabase client, created on first use.

    Double-checked under a lock: the listener and the retry sweeper are separate
    tasks on the same event loop, and both can reach this on the very first
    message. Creating two clients would leak one of them silently.
    """
    global _client
    if _client is not None and not _client.is_closed:
        return _client

    async with _client_lock:
        if _client is None or _client.is_closed:
            _client = httpx.AsyncClient(
                base_url=settings.supabase_url,
                headers=_REST_HEADERS,
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=_LIMITS,
            )
    return _client


async def close_client() -> None:
    """Releases pooled connections on shutdown. Safe to call more than once."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None


async def _raise_for_status(response: httpx.Response, context: str) -> None:
    if response.status_code < 400:
        return

    body = response.text[:500]

    # PGRST205 is "table not in PostgREST's schema cache". Taken at face value it
    # reads as "the table is missing", which sends you looking at the schema —
    # but the far likelier cause, and the one that actually bit us, is that the
    # migrations were applied to a DIFFERENT database than this service is
    # pointed at. Roomi has more than one Supabase instance reachable with
    # similar-looking credentials, and the raw 404 named neither the database nor
    # the fix, so the failure looked like a code bug for far longer than it
    # should have.
    #
    # Naming the exact host we queried is the whole point: it turns "why is
    # PostgREST lying to me" into "...oh, that is the wrong instance" at a
    # glance. The URL is safe to log; the service-role key that authenticated
    # this request is deliberately never included.
    if "PGRST205" in body:
        raise SupabaseError(
            f"{context} failed: {response.status_code} {body}\n"
            f"  -> PostgREST has no such table on {settings.supabase_url}.\n"
            f"     This almost always means the Telegram migrations were never applied to\n"
            f"     THAT database (check you are not looking at a different Supabase instance).\n"
            f"     Fix: apply supabase/migrations/*telegram*.sql to it — the deploy workflow\n"
            f"     does this automatically; see supabase/migrations/README.md (Self-hosted).\n"
            f"     'NOTIFY pgrst, reload schema' will NOT help if the table genuinely is absent."
        )

    raise SupabaseError(f"{context} failed on {settings.supabase_url}: {response.status_code} {body}")


# --- telegram_sources --------------------------------------------------------


async def get_enabled_sources() -> list[dict[str, Any]]:
    """
    All sources the worker should currently be listening to, most important
    first.

    Ordered by the admin-set priority so a backlog is drained in the order the
    operator cares about, and so adding, removing or reordering channels is a
    row edit rather than a deploy.
    """
    client = await get_client()
    response = await client.get(
        "/rest/v1/telegram_sources",
        params={"select": "*", "enabled": "eq.true", "order": "priority.asc,created_at.asc"},
    )
    await _raise_for_status(response, "get_enabled_sources")
    return response.json()


async def get_source_by_id(source_id: str) -> dict[str, Any] | None:
    """Used by the retry sweeper to re-resolve the chat a stored message came from."""
    client = await get_client()
    response = await client.get(
        "/rest/v1/telegram_sources",
        params={"select": "*", "id": f"eq.{source_id}", "limit": "1"},
    )
    await _raise_for_status(response, "get_source_by_id")
    rows = response.json()
    return rows[0] if rows else None


# --- telegram_messages --------------------------------------------------------


async def record_message_if_new(payload: dict[str, Any]) -> dict[str, Any] | None:
    """
    Inserts the message row, or returns None if it was already recorded.

    The (telegram_source_id, telegram_message_id) unique constraint is the
    authoritative duplicate guard — this survives a crash-and-restart replay of
    the same events, not just an in-memory "seen" set that a restart would
    forget.

    `on_conflict` is REQUIRED here, not decorative. `Prefer:
    resolution=ignore-duplicates` on its own only covers a conflict on the
    PRIMARY KEY; the guard we care about is the composite UNIQUE constraint, and
    without naming it PostgREST returns 409 on every duplicate. Verified against
    production: identical request, 409 without `on_conflict` and 201 with it.
    A 409 would raise SupabaseError, so replaying an already-seen message logged
    an ERROR with a stack trace on a completely normal code path — making routine
    deduplication look identical to a broken database, which is exactly the
    signal an operator needs to be able to trust. With `on_conflict` the
    duplicate comes back 201 with an empty body, so `rows` is empty and this
    returns None, which is the contract stated above.
    """
    client = await get_client()
    response = await client.post(
        "/rest/v1/telegram_messages?on_conflict=telegram_source_id,telegram_message_id",
        headers={"Prefer": "resolution=ignore-duplicates,return=representation"},
        json=payload,
    )
    await _raise_for_status(response, "record_message_if_new")
    rows = response.json()
    return rows[0] if rows else None


async def mark_message_processed(message_id: str, last_error: str | None = None) -> None:
    """
    Marks a message finished — successfully, or failed in a way retrying cannot
    fix. `next_attempt_at` is cleared so a finished row can never look due.
    """
    client = await get_client()
    response = await client.patch(
        "/rest/v1/telegram_messages",
        params={"id": f"eq.{message_id}"},
        json={"processed": True, "next_attempt_at": None, "last_error": last_error},
    )
    await _raise_for_status(response, "mark_message_processed")


async def schedule_message_retry(
    message_id: str, attempts: int, next_attempt_at: str, last_error: str
) -> None:
    """
    Leaves the message UNPROCESSED and due again at `next_attempt_at`.

    The counterpart to mark_message_processed(): this is the path a Supabase or
    Storage outage takes, so the message stays in the queue instead of being
    retired unseen.
    """
    client = await get_client()
    response = await client.patch(
        "/rest/v1/telegram_messages",
        params={"id": f"eq.{message_id}"},
        json={
            "attempts": attempts,
            "next_attempt_at": next_attempt_at,
            "last_error": last_error[:2000],
        },
    )
    await _raise_for_status(response, "schedule_message_retry")


async def get_due_messages(limit: int, now_iso: str) -> list[dict[str, Any]]:
    """
    Unprocessed messages eligible for another attempt, oldest first.

    `next_attempt_at` is NULL for a message that has never been retried (and for
    every row that predates the retry columns), so the filter has to accept NULL
    as "due now" rather than comparing it — in SQL, `null <= now()` is null, not
    true, which would make exactly the messages most in need of a first retry
    invisible to this query.
    """
    client = await get_client()
    response = await client.get(
        "/rest/v1/telegram_messages",
        params={
            "select": "*",
            "processed": "eq.false",
            "or": f"(next_attempt_at.is.null,next_attempt_at.lte.{now_iso})",
            "order": "created_at.asc",
            "limit": str(limit),
        },
    )
    await _raise_for_status(response, "get_due_messages")
    return response.json()


async def listing_exists_for_message(message_row_id: str) -> bool:
    """
    Whether a draft was already created for this message.

    The retry sweeper is not the only writer, and a message can be re-queued
    after a partial failure, so this guards against a second draft for the same
    message — the DB has no unique constraint on telegram_listings
    .telegram_message_id (a message legitimately may produce none).
    """
    client = await get_client()
    response = await client.get(
        "/rest/v1/telegram_listings",
        params={"select": "id", "telegram_message_id": f"eq.{message_row_id}", "limit": "1"},
    )
    await _raise_for_status(response, "listing_exists_for_message")
    return bool(response.json())


# --- telegram_listings --------------------------------------------------------


async def create_telegram_listing(payload: dict[str, Any]) -> dict[str, Any]:
    client = await get_client()
    response = await client.post(
        "/rest/v1/telegram_listings",
        headers={"Prefer": "return=representation"},
        json=payload,
    )
    await _raise_for_status(response, "create_telegram_listing")
    return response.json()[0]


# --- site_settings: the publish policy ----------------------------------------


async def get_publish_policy_raw() -> dict[str, Any]:
    """
    The operator's automatic-publishing settings, read from the same
    `site_settings` table the admin panel writes.

    Absent means absent: no row, no key, or an unreadable one all yield `{}`,
    which the caller turns into a DISABLED policy. The failure direction
    matters — a settings read that quietly failed open would publish
    unattended, which is exactly the outcome this whole gate exists to control.
    """
    client = await get_client()
    response = await client.get(
        "/rest/v1/site_settings",
        params={"select": "value", "key": "eq.telegram_publish", "limit": "1"},
    )
    await _raise_for_status(response, "get_publish_policy")
    rows = response.json()
    value = rows[0].get("value") if rows else None
    return value if isinstance(value, dict) else {}


# --- telegram_sessions --------------------------------------------------------


async def get_active_session() -> dict[str, Any] | None:
    """
    The session the worker should authenticate with, if an admin has uploaded
    one.

    Returning None is normal, not an error: it means "no session configured",
    and the caller falls back to the .session file on disk so an existing
    deployment keeps working untouched.
    """
    client = await get_client()
    response = await client.get(
        "/rest/v1/telegram_sessions",
        params={"select": "*", "is_active": "eq.true", "limit": "1"},
    )
    await _raise_for_status(response, "get_active_session")
    rows = response.json()
    return rows[0] if rows else None


async def report_session_status(
    session_id: str,
    status: str,
    detail: str = "",
    account: dict[str, Any] | None = None,
) -> None:
    """
    Records what the worker actually observed about the credential.

    This is the field an operator needs and could not previously see: not "is
    the container running" but "when did this session last succeed at talking
    to Telegram, and which account is it". Reported by the worker rather than
    by whoever uploaded the file, because only the worker knows.
    """
    payload: dict[str, Any] = {
        "status": status,
        "status_detail": detail[:500],
        "last_heartbeat_at": _now_iso(),
    }
    if status == "connected":
        payload["authorized_at"] = payload["last_heartbeat_at"]
    if account:
        payload.update(
            {
                "account_username": account.get("username", "") or "",
                "account_display_name": account.get("display_name", "") or "",
                "account_telegram_id": account.get("telegram_id"),
            }
        )

    client = await get_client()
    response = await client.patch(
        "/rest/v1/telegram_sessions",
        params={"id": f"eq.{session_id}"},
        json=payload,
    )
    await _raise_for_status(response, "report_session_status")


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


# --- Storage ------------------------------------------------------------------


# 64 KB: comfortably larger than a TCP window's worth, small enough that this is
# the only part of an image ever resident.
_UPLOAD_CHUNK_BYTES = 64 * 1024


async def _chunks(stream: BinaryIO, chunk_size: int = _UPLOAD_CHUNK_BYTES) -> AsyncIterator[bytes]:
    """
    Reads `stream` a chunk at a time as an ASYNC generator.

    The async part is not decoration. httpx's AsyncClient refuses a plain file
    object outright — "Attempted to send an sync request with an AsyncClient
    instance" — because a file is `Iterable`, and a sync iterator cannot be
    consumed by the async transport. Handing it the file directly type-checks,
    reads correctly, and fails on the first real upload.
    """
    while True:
        chunk = stream.read(chunk_size)
        if not chunk:
            return
        yield chunk


async def upload_photo_stream(path: str, stream: BinaryIO, size: int, content_type: str) -> str:
    """
    Uploads a photo by STREAMING an open file object, never by materialising it.

    Same bucket the Next.js app's /api/upload route writes to
    (NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET, default "roommate-assets") — the
    existing storage structure, not a new one.

    `size` is passed explicitly so a Content-Length goes out with the request:
    without it httpx falls back to chunked transfer-encoding, which the Storage
    API behind Kong rejects. Feeding it chunks rather than bytes is what keeps
    peak memory at 64 KB instead of one whole image.

    Returns the public URL, built the same way src/app/api/upload/route.ts does:
    anchored to the PUBLIC Supabase origin even when this service talks to an
    internal gateway, because the link is stored in the database and eventually
    loaded by a browser that cannot resolve an internal hostname.
    """
    bucket = settings.supabase_storage_bucket
    client = await get_client()
    response = await client.post(
        f"/storage/v1/object/{bucket}/{path}",
        headers={
            "Content-Type": content_type,
            "Content-Length": str(size),
            "x-upsert": "false",
        },
        content=_chunks(stream),
    )
    await _raise_for_status(response, "upload_photo")

    return f"{settings.supabase_public_url}/storage/v1/object/public/{bucket}/{path}"
