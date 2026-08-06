"""
The stages between "Telegram delivered something" and "a draft exists":
album reassembly, the spam gate's position in the order, and photo handling.

These are the parts that decide whether a post reaches the admin panel at all,
and every one of them has already failed silently in production once.

Driven with asyncio.run() rather than pytest-asyncio (not in requirements.txt —
see test_db_errors.py).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest

import telegram_listener as tl
from app.albums import AlbumBuffer


class FakeMessage:
    """The handful of Telethon Message attributes this service reads."""

    def __init__(self, message_id, text="", grouped_id=None, photo=None, sender=None):
        self.id = message_id
        self.raw_text = text
        self.message = text
        self.grouped_id = grouped_id
        self.photo = photo
        self.sender = sender
        self.date = datetime(2026, 8, 6, 12, 0, tzinfo=timezone.utc)
        self.post_author = ""


class FakeSender:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id")
        self.username = kwargs.get("username", "")
        self.first_name = kwargs.get("first_name", "")
        self.last_name = kwargs.get("last_name", "")
        self.title = kwargs.get("title", "")
        self.bot = kwargs.get("bot", False)


SOURCE = {"id": "src-1", "telegram_username": "SDU_housing", "default_city": "Almaty"}
REAL_POST = "Сдается 2-комнатная квартира рядом с SDU, 200 000 тг + коммуналка. +77011619404"


# --- album reassembly ---------------------------------------------------------


def test_an_album_is_flushed_as_one_group():
    """
    Six events, one post. Handling them individually is what produced 26
    "message has no text" rows in production and one photo per draft.
    """
    flushed: list[tuple[list, str]] = []

    async def flush(group, source_id):
        flushed.append((group, source_id))

    async def scenario():
        buffer = AlbumBuffer(0.05, flush)
        for index in range(6):
            caption = REAL_POST if index == 2 else ""
            await buffer.add(777, FakeMessage(100 + index, caption, grouped_id=777, photo=object()), "src-1")
        await asyncio.sleep(0.15)
        await buffer.close()

    asyncio.run(scenario())

    assert len(flushed) == 1, "one album must produce exactly one flush"
    group, source_id = flushed[0]
    assert len(group) == 6
    assert source_id == "src-1"


def test_album_members_are_flushed_in_the_order_the_poster_arranged_them():
    flushed: list[list] = []

    async def flush(group, _source_id):
        flushed.append(group)

    async def scenario():
        buffer = AlbumBuffer(0.05, flush)
        for message_id in (103, 101, 102):
            await buffer.add(777, FakeMessage(message_id, grouped_id=777, photo=object()), "src-1")
        await asyncio.sleep(0.15)
        await buffer.close()

    asyncio.run(scenario())
    assert [m.id for m in flushed[0]] == [101, 102, 103]


def test_the_album_buffer_is_bounded():
    """Unbounded buffering of message objects is how a long-lived worker dies."""
    flushed: list[list] = []

    async def flush(group, _source_id):
        flushed.append(group)

    async def scenario():
        buffer = AlbumBuffer(30.0, flush)  # long wait: nothing flushes on time
        for group_id in range(40):
            await buffer.add(group_id, FakeMessage(group_id, grouped_id=group_id), "src-1")
        pending = buffer.pending_groups
        await buffer.close()
        return pending

    assert asyncio.run(scenario()) <= 32


def test_the_caption_is_found_wherever_in_the_album_it_sits():
    group = [FakeMessage(101), FakeMessage(102, REAL_POST), FakeMessage(103)]
    primary, text = tl.choose_primary(group)
    assert primary.id == 102
    assert text == REAL_POST


def test_a_captionless_album_still_has_a_stable_identity():
    """
    The dedup key must not depend on which member happened to arrive first, or
    a restart mid-album would import the same post twice.
    """
    group = [FakeMessage(101), FakeMessage(102), FakeMessage(103)]
    primary, text = tl.choose_primary(group)
    assert primary.id == 101
    assert text == ""


# --- the spam gate comes before the first write -------------------------------


def _capture(monkeypatch):
    """Records every database call process_group would make."""
    recorded: dict[str, list] = {"messages": [], "attempts": []}

    async def _record(payload):
        recorded["messages"].append(payload)
        return {"id": "row-1", "attempts": 0}

    async def _attempt(*args, **kwargs):
        recorded["attempts"].append(args)

    monkeypatch.setattr(tl, "record_message_if_new", _record)
    monkeypatch.setattr(tl, "_run_attempt", _attempt)
    return recorded


def test_spam_never_reaches_the_database(monkeypatch):
    """
    The whole point of the gate: an advert costs one regex sweep and leaves no
    row, no photo download and nothing for an admin to dismiss.
    """
    recorded = _capture(monkeypatch)

    asyncio.run(tl.process_group([FakeMessage(1, "Куплю юсдт, жду ваши сообщения")], SOURCE))

    assert recorded["messages"] == []
    assert recorded["attempts"] == []


def test_a_real_post_does_reach_the_database(monkeypatch):
    recorded = _capture(monkeypatch)

    asyncio.run(tl.process_group([FakeMessage(1, REAL_POST)], SOURCE))

    assert len(recorded["messages"]) == 1
    assert len(recorded["attempts"]) == 1


def test_a_bot_post_is_dropped_before_the_database(monkeypatch):
    recorded = _capture(monkeypatch)
    message = FakeMessage(1, REAL_POST, sender=FakeSender(id=5, username="somebot", bot=True))

    asyncio.run(tl.process_group([message], SOURCE))

    assert recorded["messages"] == []


def test_an_identical_repost_is_dropped_before_the_database(monkeypatch):
    recorded = _capture(monkeypatch)
    tl._recent_content = type(tl._recent_content)(capacity=16)  # noqa: SLF001 - fresh cache per test

    asyncio.run(tl.process_group([FakeMessage(1, REAL_POST)], SOURCE))
    asyncio.run(tl.process_group([FakeMessage(2, REAL_POST)], SOURCE))

    assert len(recorded["messages"]) == 1


# --- what gets recorded -------------------------------------------------------


def test_the_sender_is_stored_exactly_as_telegram_reports_it(monkeypatch):
    recorded = _capture(monkeypatch)
    tl._recent_content = type(tl._recent_content)(capacity=16)  # noqa: SLF001
    sender = FakeSender(id=4242, username="aigerim", first_name="Aigerim", last_name="N")

    asyncio.run(tl.process_group([FakeMessage(9, REAL_POST, sender=sender)], SOURCE))

    payload = recorded["messages"][0]
    assert payload["sender_telegram_id"] == 4242
    assert payload["sender_username"] == "aigerim"
    assert payload["sender_first_name"] == "Aigerim"
    assert payload["sender_last_name"] == "N"
    assert payload["sender_display_name"] == "Aigerim N"
    assert payload["sender_is_bot"] is False


def test_a_channels_title_is_its_display_name(monkeypatch):
    """
    A channel has no first/last name. Assembling a display name from the parts
    would leave it blank for exactly the sources this service watches.
    """
    recorded = _capture(monkeypatch)
    tl._recent_content = type(tl._recent_content)(capacity=16)  # noqa: SLF001
    sender = FakeSender(id=-100, title="SDU Housing", username="SDU_housing")

    asyncio.run(tl.process_group([FakeMessage(11, REAL_POST, sender=sender)], SOURCE))

    assert recorded["messages"][0]["sender_display_name"] == "SDU Housing"


def test_the_original_text_and_message_identity_are_preserved(monkeypatch):
    recorded = _capture(monkeypatch)
    tl._recent_content = type(tl._recent_content)(capacity=16)  # noqa: SLF001

    asyncio.run(tl.process_group([FakeMessage(12345, REAL_POST, grouped_id=777)], SOURCE))

    payload = recorded["messages"][0]
    assert payload["content"] == REAL_POST
    assert payload["telegram_message_id"] == 12345
    assert payload["telegram_source_id"] == "src-1"
    assert payload["grouped_id"] == 777
    assert payload["message_date"].startswith("2026-08-06")


def test_every_photo_in_an_album_is_recorded_for_a_later_retry(monkeypatch):
    """
    Without these ids a retry can only re-fetch the captioned message, and the
    draft comes back with one photo out of six.
    """
    recorded = _capture(monkeypatch)
    tl._recent_content = type(tl._recent_content)(capacity=16)  # noqa: SLF001
    group = [
        FakeMessage(201, REAL_POST, grouped_id=777, photo=object()),
        FakeMessage(202, "", grouped_id=777, photo=object()),
        FakeMessage(203, "", grouped_id=777, photo=object()),
    ]

    asyncio.run(tl.process_group(group, SOURCE))

    assert recorded["messages"][0]["photo_message_ids"] == [201, 202, 203]


def test_a_duplicate_message_is_not_processed_twice(monkeypatch):
    """
    record_message_if_new returns None when the unique constraint swallowed the
    insert. That is the authoritative dedup guard, not the in-memory cache.
    """
    attempts: list = []

    async def _already_seen(_payload):
        return None

    async def _attempt(*args, **kwargs):
        attempts.append(args)

    monkeypatch.setattr(tl, "record_message_if_new", _already_seen)
    monkeypatch.setattr(tl, "_run_attempt", _attempt)
    tl._recent_content = type(tl._recent_content)(capacity=16)  # noqa: SLF001

    asyncio.run(tl.process_group([FakeMessage(1, REAL_POST)], SOURCE))

    assert attempts == []


def test_a_database_failure_while_recording_does_not_crash_the_listener(monkeypatch):
    async def _boom(_payload):
        raise RuntimeError("supabase is down")

    monkeypatch.setattr(tl, "record_message_if_new", _boom)
    tl._recent_content = type(tl._recent_content)(capacity=16)  # noqa: SLF001

    # No exception escaping is the assertion.
    asyncio.run(tl.process_group([FakeMessage(1, REAL_POST)], SOURCE))


def test_an_empty_group_is_a_no_op():
    asyncio.run(tl.process_group([], SOURCE))


# --- photos -------------------------------------------------------------------


def test_a_photo_over_the_limit_is_skipped_without_downloading_it():
    """Telegram declares the size up front; downloading 40 MB to then reject it is waste."""
    from app import media

    class Oversized(FakeMessage):
        def __init__(self):
            super().__init__(1, photo=object())
            self.file = type("F", (), {"size": 40 * 1024 * 1024})()

        async def download_media(self, file=None):  # pragma: no cover - must not run
            raise AssertionError("an oversized photo must not be downloaded")

    assert asyncio.run(media.download_media([Oversized()], "draft-1")) == []


def test_a_message_with_no_photos_uploads_nothing():
    from app import media

    assert asyncio.run(media.download_media([FakeMessage(1, REAL_POST)], "draft-1")) == []


def test_one_failing_photo_does_not_lose_the_others(monkeypatch):
    """A draft with 2 of 3 photos beats no draft at all."""
    from app import media

    class Photo(FakeMessage):
        def __init__(self, message_id, ok=True):
            super().__init__(message_id, photo=object())
            self.file = type("F", (), {"size": 1024})()
            self._ok = ok

        async def download_media(self, file=None):
            if not self._ok:
                raise RuntimeError("download failed")
            file.write(b"\xff\xd8\xff" + b"0" * 100)

    async def _upload(path, stream, size, content_type):
        return f"https://cdn.example/{path}"

    monkeypatch.setattr(media, "upload_photo_stream", _upload)

    urls = asyncio.run(media.download_media([Photo(1), Photo(2, ok=False), Photo(3)], "draft-1"))
    assert len(urls) == 2


def test_a_file_that_is_not_an_image_is_rejected_on_its_bytes(monkeypatch):
    """The declared type is never trusted, mirroring the app's own upload route."""
    from app import media

    class NotAnImage(FakeMessage):
        def __init__(self):
            super().__init__(1, photo=object())
            self.file = type("F", (), {"size": 1024})()

        async def download_media(self, file=None):
            file.write(b"%PDF-1.4 this is not a photo")

    async def _upload(*args, **kwargs):  # pragma: no cover - must not run
        raise AssertionError("a non-image must never be uploaded")

    monkeypatch.setattr(media, "upload_photo_stream", _upload)

    assert asyncio.run(media.download_media([NotAnImage()], "draft-1")) == []


# --- album recovery for rows that predate photo_message_ids --------------------


class FakeClient:
    """Answers get_messages(ids=[...]) out of a fixed chat."""

    def __init__(self, messages):
        self._by_id = {m.id: m for m in messages}
        self.calls: list[list[int]] = []

    async def get_messages(self, _entity, ids):
        self.calls.append(list(ids))
        return [self._by_id.get(i) for i in ids]


def test_a_backfilled_album_is_reassembled_from_its_neighbours():
    """
    Rows recorded before photo_message_ids existed know only the caption's id.
    Without this scan every backfilled draft arrives with one photo out of six.
    """
    album = [FakeMessage(200 + i, "", grouped_id=555, photo=object()) for i in range(6)]
    album[0].raw_text = REAL_POST
    unrelated = FakeMessage(210, "another post entirely", grouped_id=999, photo=object())
    client = FakeClient(album + [unrelated])

    group = asyncio.run(tl._recover_album_siblings(client, object(), album[0]))  # noqa: SLF001

    assert [m.id for m in group] == [200, 201, 202, 203, 204, 205]
    assert 210 not in [m.id for m in group], "a neighbour from a different album must not be pulled in"


def test_a_standalone_message_is_not_scanned_for_siblings():
    """No grouped_id means no album, and no reason to spend a Telegram call."""
    client = FakeClient([])
    message = FakeMessage(300, REAL_POST)

    group = asyncio.run(tl._recover_album_siblings(client, object(), message))  # noqa: SLF001

    assert group == [message]
    assert client.calls == [], "a non-album message must cost no extra API call"


def test_album_recovery_survives_a_telegram_failure():
    class Failing(FakeClient):
        async def get_messages(self, _entity, ids):
            raise RuntimeError("flood wait")

    message = FakeMessage(300, REAL_POST, grouped_id=555, photo=object())
    group = asyncio.run(tl._recover_album_siblings(Failing([]), object(), message))  # noqa: SLF001

    assert group == [message], "the caption alone is still a usable draft"


def test_the_upload_body_really_streams_through_httpx():
    """
    Regression, caught only by making the call for real.

    upload_photo_stream() used to hand httpx the file object itself. A file is
    `Iterable`, so it type-checks and reads correctly — and then httpx's
    AsyncClient rejects it at send time with "Attempted to send an sync request
    with an AsyncClient instance", because a sync iterator cannot be consumed by
    the async transport. Every mocked test passed; every real photo upload would
    have failed.

    Asserts the bytes arrive intact AND that Content-Length is used rather than
    chunked transfer-encoding, which the Storage API behind Kong rejects.
    """
    import tempfile
    import threading
    from http.server import BaseHTTPRequestHandler, HTTPServer

    import httpx

    from app.db import _chunks  # noqa: SLF001 - the streaming shape IS the behaviour

    received: dict = {}

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):  # noqa: N802 - BaseHTTPRequestHandler's own naming
            length = int(self.headers.get("Content-Length") or 0)
            received["body_len"] = len(self.rfile.read(length))
            received["transfer_encoding"] = self.headers.get("Transfer-Encoding")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"{}")

        def log_message(self, *args):  # keep the test output clean
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]

    # Deliberately larger than one chunk, and containing a newline: iterating a
    # binary file yields LINES, so a newline in the middle is what would expose
    # a body reassembled by the wrong code path.
    payload = b"\xff\xd8\xff" + b"A" * 200_000 + b"\n" + b"B" * 50_000

    async def upload():
        spooled = tempfile.SpooledTemporaryFile(max_size=1024, mode="w+b")
        spooled.write(payload)
        size = spooled.tell()
        spooled.seek(0)
        async with httpx.AsyncClient() as client:
            return await client.post(
                f"http://127.0.0.1:{port}/object",
                content=_chunks(spooled),
                headers={"Content-Type": "image/jpeg", "Content-Length": str(size)},
            )

    try:
        response = asyncio.run(upload())
    finally:
        server.shutdown()

    assert response.status_code == 200
    assert received["body_len"] == len(payload)
    assert received["transfer_encoding"] is None, "Storage rejects chunked uploads"


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        (b"\xff\xd8\xff\xe0", "image/jpeg"),
        (b"\x89PNG\r\n\x1a\n", "image/png"),
        (b"RIFF\x00\x00\x00\x00WEBP", "image/webp"),
        (b"GIF89a", None),
        (b"%PDF", None),
    ],
)
def test_image_sniffing(header, expected):
    from app.media import _detect_image_type

    assert _detect_image_type(header) == expected
