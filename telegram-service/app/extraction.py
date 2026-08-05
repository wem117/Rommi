"""
AI listing extraction: raw Telegram message text -> structured, validated
fields.

Two-stage: (1) ask Gemini for JSON matching `RawExtraction`, tolerating a model
that wraps the JSON in prose or code fences; (2) `validate_extraction()`
re-checks and clamps every field before anything is written to the database —
"Validate AI output before saving" is enforced here, not assumed from the
model's output.

Text-only. Photos are handled entirely by app/media.py from the message's own
attachments — Gemini is never asked to invent a photo URL from message text,
and any `photos` value it returns is discarded before saving.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

import google.generativeai as genai
from pydantic import BaseModel, Field, ValidationError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.gemini_api_key)

_PROMPT_TEMPLATE = """You extract structured rental/roommate listing data from a Telegram \
message written in Russian, Kazakh, or English. Respond with ONLY a JSON object — no prose, \
no markdown code fences.

Schema (use these exact keys; use null or "" for anything not present in the text; NEVER \
invent a value that is not in the text):

{{
  "is_rental_listing": boolean,        // false if this message is not an apartment/room listing at all
  "title": string,
  "description": string,               // a clean rewrite of the post, not a verbatim copy
  "city": string,
  "district": string,
  "address": string,
  "price": number,                     // integer, 0 if not stated
  "currency": string,                  // e.g. "KZT", "USD"; default "KZT" if a price is given with no currency
  "rooms": number | null,
  "property_type": string | null,      // one of: apartment, house, dorm, studio
  "area": number | null,               // square meters
  "floor": number | null,
  "total_floors": number | null,
  "amenities": string[],
  "contact_phone": string,
  "telegram": string,
  "whatsapp": string
}}

Message:
---
{message_text}
---

JSON:"""


class RawExtraction(BaseModel):
    """Exactly what we ask the model for. Nothing here is trusted as-is."""

    is_rental_listing: bool = False
    title: str = ""
    description: str = ""
    city: str = ""
    district: str = ""
    address: str = ""
    price: float | int | str | None = 0
    currency: str = "KZT"
    rooms: int | float | str | None = None
    property_type: str | None = None
    area: float | int | str | None = None
    floor: int | float | str | None = None
    total_floors: int | float | str | None = None
    amenities: list[str] = Field(default_factory=list)
    contact_phone: str = ""
    telegram: str = ""
    whatsapp: str = ""
    # Accepted so a model that free-lances the shorter example schema from the
    # spec doesn't fail to parse; always discarded (see download_media()).
    phone: str | None = None
    photos: list[str] = Field(default_factory=list)


class ValidatedListing(BaseModel):
    """The clamped, save-safe shape written to telegram_listings."""

    is_rental_listing: bool
    title: str
    description: str
    city: str
    district: str
    address: str
    price: int
    currency: str
    rooms: int | None
    property_type: str | None
    area: float | None
    floor: int | None
    total_floors: int | None
    amenities: list[str]
    contact_phone: str
    contact_telegram: str
    contact_whatsapp: str


_VALID_PROPERTY_TYPES = {"apartment", "house", "dorm", "studio"}
_MAX_REASONABLE_PRICE = 10_000_000  # matches MAX_MONTHLY_RENT's order of magnitude


def _to_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r"[^\d.]", "", value)
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def validate_extraction(raw: RawExtraction) -> tuple[ValidatedListing, list[str]]:
    """
    Clamps and sanity-checks every field. Returns the validated record plus a
    list of human-readable warnings (surfaced as `extraction_error` — never
    fatal on their own, since a listing missing e.g. `area` is still useful for
    admin review).
    """
    warnings: list[str] = []

    price_num = _to_number(raw.price)
    if price_num is None or price_num < 0:
        warnings.append("price missing or invalid; defaulted to 0")
        price = 0
    elif price_num > _MAX_REASONABLE_PRICE:
        warnings.append(f"price {price_num} exceeds sanity limit; clamped")
        price = _MAX_REASONABLE_PRICE
    else:
        price = int(price_num)

    currency = (raw.currency or "KZT").strip().upper()[:8] or "KZT"

    property_type = (raw.property_type or "").strip().lower() or None
    if property_type and property_type not in _VALID_PROPERTY_TYPES:
        warnings.append(f"unrecognized property_type '{property_type}'; dropped")
        property_type = None

    rooms_num = _to_number(raw.rooms)
    rooms = int(rooms_num) if rooms_num is not None and 0 <= rooms_num <= 20 else None

    area_num = _to_number(raw.area)
    area = area_num if area_num is not None and 0 < area_num <= 2000 else None

    floor_num = _to_number(raw.floor)
    floor = int(floor_num) if floor_num is not None and 0 <= floor_num <= 200 else None

    total_floors_num = _to_number(raw.total_floors)
    total_floors = (
        int(total_floors_num) if total_floors_num is not None and 0 <= total_floors_num <= 200 else None
    )

    title = raw.title.strip()[:140]
    description = raw.description.strip()[:4000]
    city = raw.city.strip()[:120]

    if raw.is_rental_listing and not title and not description:
        warnings.append("model flagged this as a listing but returned no title/description")

    contact_phone = (raw.contact_phone or "").strip()[:40]
    contact_telegram = (raw.telegram or "").strip()[:120]
    contact_whatsapp = (raw.whatsapp or "").strip()[:40]

    validated = ValidatedListing(
        is_rental_listing=raw.is_rental_listing,
        title=title,
        description=description,
        city=city,
        district=raw.district.strip()[:120],
        address=raw.address.strip()[:300],
        price=price,
        currency=currency,
        rooms=rooms,
        property_type=property_type,
        area=area,
        floor=floor,
        total_floors=total_floors,
        amenities=[a.strip() for a in raw.amenities if a and a.strip()][:20],
        contact_phone=contact_phone,
        contact_telegram=contact_telegram,
        contact_whatsapp=contact_whatsapp,
    )
    return validated, warnings


def _parse_model_json(text: str) -> dict[str, Any]:
    """Models occasionally wrap JSON in ```json fences despite instructions."""
    stripped = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", stripped, re.DOTALL)
    if fence_match:
        stripped = fence_match.group(1)
    return json.loads(stripped)


class ExtractionResult(BaseModel):
    validated: ValidatedListing | None
    raw_output: dict[str, Any] | None
    error: str | None


# A minimal client-side floor on request rate, independent of whatever quota
# Gemini enforces server-side — see requirement "rate limit protection".
_last_call_monotonic = 0.0


async def _throttle() -> None:
    global _last_call_monotonic
    import asyncio

    elapsed = time.monotonic() - _last_call_monotonic
    wait = settings.ai_min_interval_seconds - elapsed
    if wait > 0:
        await asyncio.sleep(wait)
    _last_call_monotonic = time.monotonic()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=20),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
    reraise=True,
)
async def _call_gemini(message_text: str) -> str:
    await _throttle()
    model = genai.GenerativeModel(
        settings.gemini_model,
        generation_config={"response_mime_type": "application/json", "temperature": 0.1},
    )
    response = await model.generate_content_async(_PROMPT_TEMPLATE.format(message_text=message_text))
    return response.text


async def extract_listing(message_text: str) -> ExtractionResult:
    """
    Sends `message_text` to Gemini and returns a validated result.

    Never raises: every failure mode (network error, malformed JSON, a
    response that doesn't match the schema) is caught and returned as
    `ExtractionResult(error=...)` so the caller can store a `telegram_listings`
    row with `extraction_error` set instead of losing the message or crashing
    the listener — see requirement "Do not crash if: AI fails".
    """
    if not message_text or not message_text.strip():
        return ExtractionResult(validated=None, raw_output=None, error="empty message text")

    try:
        raw_text = await _call_gemini(message_text)
    except Exception as exc:  # noqa: BLE001 - AI failure must never crash the worker
        logger.exception("Gemini call failed")
        return ExtractionResult(validated=None, raw_output=None, error=f"AI request failed: {exc}")

    try:
        parsed = _parse_model_json(raw_text)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.warning("Gemini returned non-JSON output", extra={"raw_text": raw_text[:500]})
        return ExtractionResult(
            validated=None, raw_output={"_unparsed": raw_text[:2000]}, error=f"could not parse AI output: {exc}"
        )

    try:
        raw = RawExtraction.model_validate(parsed)
    except ValidationError as exc:
        logger.warning("Gemini output failed schema validation", extra={"errors": exc.errors()})
        return ExtractionResult(validated=None, raw_output=parsed, error=f"AI output failed validation: {exc}")

    validated, warnings = validate_extraction(raw)
    return ExtractionResult(
        validated=validated,
        raw_output=parsed,
        error="; ".join(warnings) if warnings else None,
    )
