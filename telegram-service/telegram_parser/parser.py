"""
The parser proper: one Telegram post in, one reviewable draft out.

Deterministic by construction. No model, no network, no API key, no quota, no
per-message cost — the same text produces the same draft on every run, on every
machine, forever. That is the property the previous AI-backed extractor could
not offer: when Gemini's free-tier quota ran out, 18 real listings were retried
eight times each and then retired unseen, and nothing about the messages
themselves had changed.

Everything here is pure. No I/O, no clock, no globals mutated per message — so
the whole thing is testable from a string literal, which is exactly how
tests/test_parser.py exercises it against real posts pulled from production.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from telegram_parser import extractors as E

# Bumped whenever a rule changes what a given post extracts to. Stored on every
# draft, so a field that looks wrong can be traced to the ruleset that produced
# it instead of being guessed at.
PARSER_VERSION = "1.0.2"

MAX_DESCRIPTION = 4000


@dataclass(slots=True)
class TelegramSender:
    """
    Who posted, exactly as Telegram reports them.

    Every field is stored verbatim and none is derived from another: a display
    name assembled from first+last is not the same thing as the display name
    Telegram gives, and when an admin has to contact a poster, the difference
    matters.
    """

    telegram_id: int | None = None
    username: str = ""
    first_name: str = ""
    last_name: str = ""
    display_name: str = ""
    is_bot: bool = False


@dataclass(slots=True)
class ParsedListing:
    """Everything the parser could establish, plus what it could not."""

    title: str = ""
    description: str = ""

    price: int | None = None
    currency: str = "KZT"
    utilities_included: bool | None = None
    utilities_note: str = ""
    deposit_amount: int | None = None
    deposit_required: bool | None = None
    deposit_note: str = ""

    city: str = ""
    district: str = ""
    zhk: str = ""
    address: str = ""
    university: str = ""
    landmarks: list[str] = field(default_factory=list)

    rooms: int | None = None
    property_type: str | None = None
    area: float | None = None
    floor: int | None = None
    total_floors: int | None = None
    capacity: int | None = None
    amenities: list[str] = field(default_factory=list)

    contact_phone: str = ""
    contact_phone_raw: str = ""
    contact_whatsapp: str = ""
    contact_whatsapp_raw: str = ""
    contact_telegram: str = ""

    listing_kind: str = "unknown"
    parser_version: str = PARSER_VERSION
    warnings: list[str] = field(default_factory=list)

    def to_draft_payload(self) -> dict[str, Any]:
        """
        The `telegram_listings` row shape.

        Kept here rather than in app/db.py so the mapping is covered by the
        parser's own tests, which run without a database, a network or a
        Telegram session.
        """
        return {
            "title": self.title,
            "description": self.description,
            "city": self.city,
            "district": self.district,
            "zhk": self.zhk,
            "address": self.address,
            "university": self.university,
            "price": self.price or 0,
            "currency": self.currency,
            "rooms": self.rooms,
            "property_type": self.property_type,
            "area": self.area,
            "floor": self.floor,
            "total_floors": self.total_floors,
            "capacity": self.capacity,
            "amenities": self.amenities,
            "utilities_included": self.utilities_included,
            "utilities_note": self.utilities_note,
            "deposit_amount": self.deposit_amount,
            "deposit_required": self.deposit_required,
            "deposit_note": self.deposit_note,
            "contact_phone": self.contact_phone,
            "contact_phone_raw": self.contact_phone_raw,
            "contact_whatsapp": self.contact_whatsapp,
            "contact_whatsapp_raw": self.contact_whatsapp_raw,
            "contact_telegram": self.contact_telegram,
            "listing_kind": self.listing_kind,
            "parser_version": self.parser_version,
            "parser_output": asdict(self),
            "extraction_error": "; ".join(self.warnings) if self.warnings else None,
        }


def parse_message(
    text: str,
    *,
    sender: TelegramSender | None = None,
    default_city: str = "",
) -> ParsedListing:
    """
    Reads one post into a draft.

    `default_city` comes from the source the message arrived on: a channel named
    "SDU Housing" posts about Kaskelen/Almaty and says so about a third of the
    time. Using it as a FALLBACK only — never an override — keeps the guarantee
    that a city stated in the post always wins, while sparing the admin from
    typing "Almaty" onto every second draft.

    `sender` supplies the Telegram handle when the post itself carries no
    contact, which is the norm in channels where the reply is "пишите в личные
    сообщения".
    """
    original = E.tidy_text(text)
    normalized = E.normalize_text(original)

    warnings: list[str] = []

    price = E.extract_price(normalized)
    location = E.extract_location(normalized, original)
    contacts = E.extract_contacts(original)
    floor, total_floors = E.extract_floors(normalized)
    rooms = E.extract_rooms(normalized)
    property_type = E.extract_property_type(normalized)

    city = location.city or default_city
    if not location.city and default_city:
        warnings.append(f"city not stated in the post; defaulted to {default_city} from the source")

    telegram_handle = contacts.telegram
    if not telegram_handle and sender is not None and sender.username:
        telegram_handle = sender.username

    if price.amount is None:
        warnings.append("no price found")
    if not contacts.phone and not telegram_handle and not contacts.whatsapp:
        warnings.append("no contact details found")

    listing_kind = E.extract_listing_kind(normalized)
    if listing_kind == "seeking":
        # Loud, and first in the list: this is a person looking for a room, not
        # a room on offer. Approving it would publish a request as inventory.
        warnings.insert(0, "looks like someone SEEKING housing, not offering it — do not publish as a listing")

    return ParsedListing(
        title=E.build_title(
            original,
            rooms=rooms,
            property_type=property_type,
            zhk=location.zhk,
            district=location.district,
            city=city,
        ),
        description=original[:MAX_DESCRIPTION],
        price=price.amount,
        currency=price.currency,
        utilities_included=price.utilities_included,
        utilities_note=price.utilities_note,
        deposit_amount=price.deposit_amount,
        deposit_required=price.deposit_required,
        deposit_note=price.deposit_note,
        city=city,
        district=location.district,
        zhk=location.zhk,
        address=location.address,
        university=location.university,
        landmarks=location.landmarks,
        rooms=rooms,
        property_type=property_type,
        area=E.extract_area(normalized),
        floor=floor,
        total_floors=total_floors,
        capacity=E.extract_capacity(normalized),
        amenities=E.extract_amenities(normalized),
        contact_phone=contacts.phone,
        contact_phone_raw=contacts.phone_raw,
        contact_whatsapp=contacts.whatsapp,
        contact_whatsapp_raw=contacts.whatsapp_raw,
        contact_telegram=telegram_handle,
        listing_kind=listing_kind,
        warnings=warnings,
    )
