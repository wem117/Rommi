"""
Regression tests for the durable AI retry queue.

THE BUG THESE EXIST FOR
-----------------------
_process_message() ended in `finally: await mark_message_processed(...)`, so a
message whose extraction died on a Gemini 429 was retired as "done". Production
was sitting on an exhausted free-tier quota, which meant every listing arriving
during the outage would have been silently discarded — no draft, no error state,
nothing to show anything had been lost.

The rule under test: a failure caused by the MOMENT keeps the message queued; a
failure caused by the MESSAGE completes it.

Driven with asyncio.run() rather than pytest-asyncio (not in requirements.txt —
see test_db_errors.py).
"""

import asyncio

import pytest

import telegram_listener as tl
from app.config import settings
from app.extraction import ExtractionResult, is_retryable_ai_error


# --- error classification -----------------------------------------------------


class _Status:
    def __init__(self, name):
        self.name = name


class _GrpcError(Exception):
    def __init__(self, name):
        super().__init__(name)
        self._name = name

    def code(self):
        return _Status(self._name)


@pytest.mark.parametrize(
    "exc",
    [
        Exception("429 You exceeded your current quota, please check your plan"),
        Exception("ResourceExhausted: quota exceeded"),
        Exception("503 The model is overloaded. Please try again later."),
        Exception("rate limit reached for this model"),
        TimeoutError("read timed out"),
        ConnectionError("connection reset"),
        _GrpcError("RESOURCE_EXHAUSTED"),
        _GrpcError("UNAVAILABLE"),
    ],
)
def test_transient_failures_are_retryable(exc):
    assert is_retryable_ai_error(exc) is True


@pytest.mark.parametrize(
    "exc",
    [
        ValueError("invalid JSON in model output"),
        Exception("400 API key not valid"),
        Exception("permission denied"),
    ],
)
def test_permanent_failures_are_not_retryable(exc):
    assert is_retryable_ai_error(exc) is False


def test_quota_error_from_production_is_retryable():
    """The verbatim shape production returned during the incident."""
    real = Exception(
        "429 You exceeded your current quota, please check your plan and billing "
        "details. quota_metric: generativelanguage.googleapis.com/"
        "generate_content_free_tier_requests quota_id: "
        "GenerateRequestsPerDayPerProjectPerModel-FreeTier"
    )
    assert is_retryable_ai_error(real) is True


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


@pytest.fixture
def recorder(monkeypatch):
    rec = _Recorder()
    monkeypatch.setattr(tl, "mark_message_processed", rec.mark_message_processed)
    monkeypatch.setattr(tl, "schedule_message_retry", rec.schedule_message_retry)
    monkeypatch.setattr(tl, "listing_exists_for_message", _async_return(False))
    return rec


def _async_return(value):
    async def _inner(*args, **kwargs):
        return value

    return _inner


def _extraction(**kwargs):
    base = {"validated": None, "raw_output": None, "error": None, "retryable": False}
    base.update(kwargs)

    async def _inner(_text):
        return ExtractionResult(**base)

    return _inner


def test_quota_failure_requeues_instead_of_completing(recorder, monkeypatch):
    """THE regression: a 429 must NOT mark the message processed."""
    monkeypatch.setattr(
        tl, "extract_listing", _extraction(error="AI request failed: 429 quota", retryable=True)
    )

    asyncio.run(tl._run_attempt({"id": "msg-1", "attempts": 0}, "some listing text", None))

    assert recorder.processed == [], "a retryable failure must not complete the message"
    assert len(recorder.retried) == 1
    message_id, attempts, next_at, error = recorder.retried[0]
    assert message_id == "msg-1"
    assert attempts == 1
    assert "429" in error
    assert next_at  # an actual timestamp was scheduled


def test_attempts_accumulate_across_retries(recorder, monkeypatch):
    monkeypatch.setattr(tl, "extract_listing", _extraction(error="429", retryable=True))

    asyncio.run(tl._run_attempt({"id": "msg-1", "attempts": 3}, "text", None))

    assert recorder.retried[0][1] == 4


def test_retries_stop_at_the_attempt_ceiling(recorder, monkeypatch):
    """A permanently failing message must not occupy the queue forever."""
    monkeypatch.setattr(tl, "extract_listing", _extraction(error="429", retryable=True))

    asyncio.run(
        tl._run_attempt(
            {"id": "msg-1", "attempts": settings.max_extraction_attempts - 1}, "text", None
        )
    )

    assert recorder.retried == []
    assert len(recorder.processed) == 1
    assert "gave up" in recorder.processed[0][1]


def test_permanent_extraction_failure_completes_the_message(recorder, monkeypatch):
    monkeypatch.setattr(
        tl, "extract_listing", _extraction(error="could not parse AI output", retryable=False)
    )

    asyncio.run(tl._run_attempt({"id": "msg-1", "attempts": 0}, "text", None))

    assert recorder.retried == []
    assert recorder.processed == [("msg-1", "could not parse AI output")]


def test_empty_message_completes_without_calling_the_ai(recorder, monkeypatch):
    def _boom(_text):
        raise AssertionError("extraction must not run on empty text")

    monkeypatch.setattr(tl, "extract_listing", _boom)

    asyncio.run(tl._run_attempt({"id": "msg-1", "attempts": 0}, "", None))

    assert recorder.retried == []
    assert len(recorder.processed) == 1


def test_flood_wait_requeues(recorder, monkeypatch):
    from telethon.errors import FloodWaitError

    async def _flood(_text):
        raise FloodWaitError(request=None)

    monkeypatch.setattr(tl, "extract_listing", _flood)

    asyncio.run(tl._run_attempt({"id": "msg-1", "attempts": 0}, "text", None))

    assert recorder.processed == []
    assert len(recorder.retried) == 1


def test_unexpected_error_completes_rather_than_looping(recorder, monkeypatch):
    """An unknown bug should not wedge the queue retrying forever."""

    async def _boom(_text):
        raise RuntimeError("something structural")

    monkeypatch.setattr(tl, "extract_listing", _boom)

    asyncio.run(tl._run_attempt({"id": "msg-1", "attempts": 0}, "text", None))

    assert recorder.retried == []
    assert len(recorder.processed) == 1
    assert "something structural" in recorder.processed[0][1]


def test_duplicate_draft_is_not_created_on_retry(recorder, monkeypatch):
    """A re-queued message that already produced a draft must not make a second."""
    validated = _ValidatedStub()
    monkeypatch.setattr(tl, "extract_listing", _extraction(validated=validated))
    monkeypatch.setattr(tl, "listing_exists_for_message", _async_return(True))

    created = []

    async def _create(*args, **kwargs):
        created.append(args)

    monkeypatch.setattr(tl, "create_draft_listing", _create)

    asyncio.run(tl._run_attempt({"id": "msg-1", "attempts": 1}, "text", None))

    assert created == []
    assert len(recorder.processed) == 1


class _ValidatedStub:
    is_rental_listing = True
