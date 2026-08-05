"""
Regression tests for the Supabase error surface.

These exist because of a real incident: the worker crash-looped for a long time
on a bare `get_enabled_sources failed: 404 {"code":"PGRST205",...}`. The tables
did exist — just in a different Supabase instance than the one this service was
configured against. The message named neither the database nor the remedy, so
the failure was read as a bug in the service rather than a deployment mistake.
The assertions below pin down the parts of the message that made the difference.

Driven with asyncio.run() rather than @pytest.mark.asyncio deliberately:
pytest-asyncio is not in requirements.txt and CI installs only
`-r requirements.txt` plus pytest, so a marker-based test would pass locally and
error in CI. The functions under test await nothing, so this costs nothing.
"""

import asyncio

import httpx
import pytest

from app.config import settings
from app.db import SupabaseError, _raise_for_status


def _response(status: int, body: str) -> httpx.Response:
    return httpx.Response(
        status_code=status,
        request=httpx.Request("GET", "https://example.supabase.co/rest/v1/telegram_sources"),
        text=body,
    )


def _check(status: int, body: str, context: str = "get_enabled_sources") -> None:
    asyncio.run(_raise_for_status(_response(status, body), context))


PGRST205_BODY = (
    '{"code":"PGRST205","message":"Could not find the table '
    "'public.telegram_sources' in the schema cache\"}"
)


def test_success_status_does_not_raise():
    _check(200, "[]")


def test_pgrst205_names_the_database_that_was_queried():
    """The single most useful fact when more than one Supabase instance exists."""
    with pytest.raises(SupabaseError) as exc:
        _check(404, PGRST205_BODY)

    message = str(exc.value)
    assert settings.supabase_url in message, "must say WHICH database answered 404"
    assert "migrations" in message.lower(), "must point at the actual remedy"
    # The dead end that cost the most time during the incident — say it outright.
    assert "NOTIFY pgrst" in message


def test_pgrst205_message_never_leaks_the_service_role_key():
    with pytest.raises(SupabaseError) as exc:
        _check(404, PGRST205_BODY)
    assert settings.supabase_service_role_key not in str(exc.value)


def test_generic_error_still_raises_with_host_and_status():
    with pytest.raises(SupabaseError) as exc:
        _check(500, "boom", context="create_telegram_listing")
    message = str(exc.value)
    assert "create_telegram_listing" in message
    assert "500" in message
    assert settings.supabase_url in message


def test_generic_error_never_leaks_the_service_role_key():
    with pytest.raises(SupabaseError) as exc:
        _check(401, "unauthorized")
    assert settings.supabase_service_role_key not in str(exc.value)
