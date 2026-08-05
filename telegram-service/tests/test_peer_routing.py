"""
Regression tests for Telegram peer-id routing.

THE BUG THESE EXIST FOR
-----------------------
listen_messages() registered its routing table under the RAW entity id while
the event handler looked the source up by `event.chat_id`, which Telethon
reports in MARKED form. For a channel those differ by the -100 prefix:

    entity.id            1582935843
    event.chat_id      -1001582935843

so `entity_to_source.get(event.chat_id)` was always None and the handler took
its early `return` on every single message. The listener stayed "connected",
logged nothing, kept a green healthcheck, and ingested exactly zero rows.
Verified against all four production sources before the fix.

The values below are the real production channel ids, kept deliberately: this
test fails against the old code and passes against the new, which is the whole
point of pinning it to reality rather than a synthetic 12345.

Driven without pytest-asyncio (not in requirements.txt — see test_db_errors.py).
"""

import pytest

from telegram_listener import peer_keys, resolve_source_id


class _Channel:
    """Stands in for telethon.tl.types.Channel for id purposes.

    Telethon's utils.get_peer_id() dispatches on type, so the marked-form
    assertions below use the real utils against real Channel objects; this
    lightweight double is only for the table-building tests.
    """

    def __init__(self, channel_id: int):
        self.id = channel_id


# (username, raw entity.id, marked event.chat_id) — production values.
PRODUCTION_SOURCES = [
    ("SDU_housing", 1582935843, -1001582935843),
    ("kbtuhousing", 2194902905, -1002194902905),
    ("Narxoz_housings", 2268231428, -1002268231428),
    ("astana_krysha", 2241442475, -1002241442475),
]


@pytest.mark.parametrize("username,raw_id,marked_id", PRODUCTION_SOURCES)
def test_marked_and_raw_ids_actually_differ(username, raw_id, marked_id):
    """Guards the premise. If these ever coincide the rest proves nothing."""
    assert raw_id != marked_id, f"{username}: test data no longer reproduces the bug"


@pytest.mark.parametrize("username,raw_id,marked_id", PRODUCTION_SOURCES)
def test_event_chat_id_routes_to_the_right_source(username, raw_id, marked_id):
    """THE regression: a real channel event must find its source row."""
    from telethon.tl.types import Channel

    entity = Channel(
        id=raw_id,
        title=username,
        photo=None,
        date=None,
        creator=False,
        left=False,
        broadcast=True,
        verified=False,
        megagroup=False,
        restricted=False,
        signatures=False,
        min=False,
        scam=False,
        has_link=False,
        has_geo=False,
        slowmode_enabled=False,
    )

    table: dict[int, str] = {}
    for key in peer_keys(entity):
        table[key] = f"source-uuid-for-{username}"

    # This is exactly what the handler does with event.chat_id.
    assert resolve_source_id(table, marked_id) == f"source-uuid-for-{username}"


@pytest.mark.parametrize("username,raw_id,marked_id", PRODUCTION_SOURCES)
def test_raw_id_also_routes(username, raw_id, marked_id):
    """Both forms must work — we register both rather than guessing."""
    table = {key: "src" for key in peer_keys(_Channel(raw_id))}
    assert resolve_source_id(table, raw_id) == "src"


def test_peer_keys_includes_the_raw_id():
    assert 1582935843 in peer_keys(_Channel(1582935843))


def test_marked_id_resolves_even_when_only_the_raw_id_was_registered():
    """
    The utils.resolve_id() fallback. A future Telethon reporting a peer in a
    form we never registered should degrade to "still routed", not "silently
    dropped" — the failure mode that caused this whole incident.
    """
    table = {1582935843: "src"}
    assert resolve_source_id(table, -1001582935843) == "src"


def test_unknown_peer_returns_none():
    table = {key: "src" for key in peer_keys(_Channel(1582935843))}
    assert resolve_source_id(table, -1009999999999) is None


def test_none_chat_id_returns_none():
    assert resolve_source_id({1: "src"}, None) is None


def test_empty_table_returns_none():
    assert resolve_source_id({}, -1001582935843) is None


def test_peer_keys_tolerates_a_non_peer_object():
    """Must not raise — a malformed entity should skip, not crash startup."""
    assert peer_keys(object()) == set()
