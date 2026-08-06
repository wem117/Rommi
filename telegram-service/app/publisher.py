"""
Publishing a cleared draft — by asking the Next.js app to do it.

The worker never writes to `listings` or `profiles` itself, and that is a
deliberate constraint rather than an accident of language. Creating a listing is
not an INSERT: it is `createTemporaryHost()` + `createListing()` +
`upsertListingAdminMeta()` + duplicate detection + cache revalidation, all of
which live in TypeScript and all of which an admin approval already runs.
Reimplementing that here would give two pipelines that drift, and the whole
promise of this feature is that an imported listing is indistinguishable from a
hand-seeded one.

So the worker calls the same endpoint the admin panel's Approve button reaches,
authenticated as a service rather than as a person. One pipeline, two callers.

Failure is never fatal: if the app is unreachable, or refuses, the draft simply
stays `pending_review` and a human sees it — which is the outcome the whole
gate is biased towards anyway.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


def is_configured() -> bool:
    """Whether automatic publishing can even be attempted."""
    return bool(settings.app_internal_url and settings.internal_api_secret)


async def publish_draft(draft_id: str, reason: str = "") -> dict[str, Any] | None:
    """
    Asks the app to publish `draft_id`. Returns its response, or None on any
    failure.

    Never raises. A draft that fails to publish is a draft that stays in the
    review queue, which is a safe and self-correcting state — whereas an
    exception here would fail the whole message and re-queue a post that has
    already been recorded.
    """
    if not is_configured():
        logger.info(
            "Automatic publishing is not configured; leaving the draft for review",
            extra={"draft_id": draft_id},
        )
        return None

    url = f"{settings.app_internal_url}/api/internal/telegram-imports/{draft_id}/publish"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                url,
                headers={
                    # A shared secret, not a user session: this call is the
                    # service acting on its own behalf, and the endpoint refuses
                    # anything that cannot present it.
                    "x-internal-secret": settings.internal_api_secret,
                    "Content-Type": "application/json",
                },
                json={"reason": reason},
            )
    except Exception as exc:  # noqa: BLE001 - unreachable app must not lose the draft
        logger.warning(
            "Could not reach the app to publish; draft stays in review",
            extra={"draft_id": draft_id, "error": str(exc)[:200]},
        )
        return None

    if response.status_code >= 400:
        logger.warning(
            "App refused to publish the draft; it stays in review",
            extra={
                "draft_id": draft_id,
                "status": response.status_code,
                "body": response.text[:300],
            },
        )
        return None

    return response.json()
