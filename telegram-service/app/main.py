"""
FastAPI wrapper around the Telegram listener.

The listener itself is a long-lived asyncio task (MTProto keeps a persistent
connection open), started from FastAPI's lifespan handler and run alongside
the HTTP server in the same process/event loop. This gives the "separate
service... prefer separate service because Telegram MTProto requires a
persistent worker" requirement an HTTP surface for health checks (matching
the Next.js app's own /api/health convention) without needing two processes.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.logging_config import configure_logging
from telegram_listener import get_listener_status, run_forever

configure_logging()
logger = logging.getLogger(__name__)

_listener_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _listener_task
    _listener_task = asyncio.create_task(run_forever())
    logger.info("Telegram listener task started")
    try:
        yield
    finally:
        if _listener_task:
            _listener_task.cancel()
            try:
                await _listener_task
            except asyncio.CancelledError:
                pass
        logger.info("Telegram listener task stopped")


app = FastAPI(title="Roomi Telegram Import Service", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    """
    Liveness probe (the container process is up and serving) plus the
    listener's REAL connection state — not just whether its asyncio task
    object is still alive.

    run_forever()'s supervisor loop is designed to NEVER let that task die
    (catch, log, backoff, retry — see requirement "do not crash if Telegram
    unavailable"), so "is the task still running" is true even while every
    connection attempt fails for want of a session. Gating this endpoint on
    task-liveness alone would report "running" whether or not Telegram is
    actually reachable, which would silently hide exactly the failure mode an
    operator needs to see after a fresh deploy with no session yet.

    `state` is one of: "starting", "connected" (authenticated, listening),
    "disconnected", "error" (see `detail` for the last exception).

    Deliberately still returns HTTP 200 in every case, including "error" — a
    transient/expected state (e.g. no session yet) must not fail the
    container's Docker healthcheck and trigger a pointless restart loop; see
    the module docstring above for the same reasoning applied to the Next.js
    app's own /api/health.
    """
    status = get_listener_status()
    return {"server": "ok", "listener": status["state"], "listener_detail": status["detail"]}
