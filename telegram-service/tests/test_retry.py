"""
Regression tests for the durable retry queue.

THE BUG THESE EXIST FOR
-----------------------
_process_message() once ended in `finally: await mark_message_processed(...)`,
so a message whose import died on a transient fault was retired as "done".
Production was sitting on an exhausted AI quota at the time, which meant every
listing arriving during the outage was silently discarded — no draft, no error
state, nothing to show anything had been lost.

The AI is gone, which removes the failure mode that caused the incident but not
the rule it taught: a failure caused by the MOMENT keeps the message queued; a
failure caused by the MESSAGE completes it. With deterministic parsing the first
category is now exactly "the network or Supabase was unavailable" — a much
smaller and more honest set than guessing at quota semantics from exception text.

Driven with asyncio.run() rather than pytest-asyncio (not in requirements.txt —
see test_db_errors.py).
"""

import asyncio

import pytest

import telegram_listener as tl
from app.config import settings
from app.db import SupabaseError
from telegram_parser import TelegramSender


# --- error classification -----------------------------------------------------


@pytest.mark.parametrize(
    "exc",
    [
        SupabaseError("create_telegram_listing failed: 503"),
        TimeoutError("read timed out"),
        ConnectionError("connection reset"),
        OSError("network is unreachable"),
    ],
)
def test_transport_failures_are_retryable(exc):
    assert tl.is_retryable(exc) is True


def test_httpx_failures_are_retryable():
    import httpx

    assert tl.is_retryable(httpx.ConnectError("nope")) is True
    assert tl.is_retryable(httpx.ReadTimeout("nope")) is True


@pytest.mark.parametrize(
    "exc",
    [
        ValueError("bad value"),
        KeyError("missing"),
        RuntimeError("something structural"),
    ],
)
def test_logic_failures_are_not_retryable(exc):
    """
    Deterministic parsing means a message that failed to parse will fail
    identically forever. Queueing it would occupy the sweeper on a message
    nothing can fix.
    """
    assert tl.is_retryable(exc) is False


# --- backoff ------------------------------------------------------------------


def test_backoff_grows_exponentially():
    delays = [tl.retry_delay_seconds(n) for n in range(1, 5)]
    assert delays == sorted(delays)
    assert delays[1] == delays[0] * 2
    assert delays[2] == delays[0] * 4


def test_backoff_is_capped():
    assert tl.retry_delay_seconds(999) == settings.retry_max_seconds


def test_backoff_handles_a_zero_attempt_count():
    assert tl.retry_delay_seconds(0) == settings.retry_base_seconds


# --- the completion-vs-requeue decision ---------------------------------------


class _Recorder:
    """Captures which terminal DB call _run_attempt chose."""

    def __init__(self):
        self.processed: list[tuple] = []
        self.retried: list[tuple] = []

    async def mark_message_processed(self, message_id, last_error=None):
        self.processed.append((message_id, last_error))

    async def schedule_message_retry(self, message_id, attempts, next_attempt_at, last_error):
        self.retried.append((message_id, attempts, next_attempt_at, last_error))


def _async_return(value):
    async def _inner(*args, **kwargs):
        return value

    return _inner


def _async_raise(exc):
    async def _inner(*args, **kwargs):
        raise exc

    return _inner


@pytest.fixture
def recorder(monkeypatch):
    rec = _Recorder()
    monkeypatch.setattr(tl, "mark_message_processed", rec.mark_message_processed)
    monkeypatch.setattr(tl, "schedule_message_retry", rec.schedule_message_retry)
    monkeypatch.setattr(tl, "listing_exists_for_message", _async_return(False))
    monkeypatch.setattr(tl, "download_media", _async_return([]))
    monkeypatch.setattr(tl, "create_telegram_listing", _async_return({"id": "draft-1"}))
    return rec


def _run(row, text="Сдается 2-комнатная квартира, 200 000 тг", group=None):
    return asyncio.run(
        tl._run_attempt(row, text, group or [], TelegramSender(), "Almaty")  # noqa: SLF001
    )


def test_a_supabase_outage_requeues_instead_of_completing(recorder, monkeypatch):
    """THE regression: a transient write failure must NOT mark the message processed."""
    monkeypatch.setattr(tl, "create_telegram_listing", _async_raise(SupabaseError("503 upstream")))

    _run({"id": "msg-1", "attempts": 0})

    assert recorder.processed == [], "a retryable failure must not complete the message"
    assert len(recorder.retried) == 1
    message_id, attempts, next_at, error = recorder.retried[0]
    assert message_id == "msg-1"
    assert attempts == 1
    assert "503" in error
    assert next_at  # an actual timestamp was scheduled


def test_attempts_accumulate_across_retries(recorder, monkeypatch):
    monkeypatch.setattr(tl, "create_telegram_listing", _async_raise(SupabaseError("503")))

    _run({"id": "msg-1", "attempts": 3})

    assert recorder.retried[0][1] == 4


def test_retries_stop_at_the_attempt_ceiling(recorder, monkeypatch):
    """A permanently failing message must not occupy the queue forever."""
    monkeypatch.setattr(tl, "create_telegram_listing", _async_raise(SupabaseError("503")))

    _run({"id": "msg-1", "attempts": settings.max_process_attempts - 1})

    assert recorder.retried == []
    assert len(recorder.processed) == 1
    assert "gave up" in recorder.processed[0][1]


def test_a_successful_import_completes_the_message(recorder):
    _run({"id": "msg-1", "attempts": 0})

    assert recorder.retried == []
    assert recorder.processed == [("msg-1", None)]


def test_flood_wait_requeues(recorder, monkeypatch):
    from telethon.errors import FloodWaitError

    monkeypatch.setattr(tl, "download_media", _async_raise(FloodWaitError(request=None)))

    # A group with something in it, or download_media is never reached — the
    # photo step is skipped entirely for a text-only post.
    _run({"id": "msg-1", "attempts": 0}, group=[object()])

    assert recorder.processed == []
    assert len(recorder.retried) == 1


def test_an_unexpected_error_completes_rather_than_looping(recorder, monkeypatch):
    """An unknown bug should not wedge the queue retrying forever."""
    monkeypatch.setattr(tl, "create_telegram_listing", _async_raise(RuntimeError("something structural")))

    _run({"id": "msg-1", "attempts": 0})

    assert recorder.retried == []
    assert len(recorder.processed) == 1
    assert "something structural" in recorder.processed[0][1]


def test_duplicate_draft_is_not_created_on_retry(recorder, monkeypatch):
    """A re-queued message that already produced a draft must not make a second."""
    monkeypatch.setattr(tl, "listing_exists_for_message", _async_return(True))

    created = []

    async def _create(payload):
        created.append(payload)
        return {"id": "draft-1"}

    monkeypatch.setattr(tl, "create_telegram_listing", _create)

    _run({"id": "msg-1", "attempts": 1})

    assert created == []
    assert len(recorder.processed) == 1


def test_a_textless_queued_message_completes_without_a_draft(recorder, monkeypatch):
    """
    The retry queue is a second entrance to the pipeline, so it needs the same
    gate. The rows this service accumulated during the AI outage include 26
    textless album members; parsing one produces an empty draft, which is worse
    than none — it is work for an admin that can only end in a rejection.
    """
    written: list[dict] = []

    async def _create(payload):
        written.append(payload)
        return {"id": "draft-1"}

    monkeypatch.setattr(tl, "create_telegram_listing", _create)

    _run({"id": "msg-1", "attempts": 2}, text="")

    assert written == []
    assert recorder.processed == [("msg-1", None)]


def test_a_real_queued_message_still_produces_a_draft(recorder, monkeypatch):
    written: list[dict] = []

    async def _create(payload):
        written.append(payload)
        return {"id": "draft-1"}

    monkeypatch.setattr(tl, "create_telegram_listing", _create)

    _run({"id": "msg-1", "attempts": 2})

    assert len(written) == 1


def test_the_draft_is_always_written_as_pending_review(recorder, monkeypatch):
    """
    Nothing in this worker may publish. The status it writes is fixed, and this
    test is the tripwire for a future change that tries to make it a parameter.
    """
    written: list[dict] = []

    async def _create(payload):
        written.append(payload)
        return {"id": "draft-1"}

    monkeypatch.setattr(tl, "create_telegram_listing", _create)

    _run({"id": "msg-1", "attempts": 0})

    assert written[0]["status"] == "pending_review"
    assert written[0]["telegram_message_id"] == "msg-1"
