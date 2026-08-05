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
from telegram_listener import run_forever

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
    Liveness/readiness probe. Reports the listener task's state without
    depending on Telegram or Supabase actually being reachable right now — a
    transient upstream blip must not fail the container's health check and
    trigger an unnecessary restart (same philosophy as the Next.js app's
    /api/health, which gates on the process serving requests, not on the
    database being reachable).
    """
    task_alive = _listener_task is not None and not _listener_task.done()
    return {
        "server": "ok",
        "listener": "running" if task_alive else "stopped",
    }
