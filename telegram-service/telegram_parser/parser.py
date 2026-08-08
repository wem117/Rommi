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
PARSER_VERSION = "2.4.0"

MAX_DESCRIPTION = 4000

# --------------------------------------------------------------- draft kinds

# What KIND of record this post should become, which is not the same question as
# what the post is about. Both of these mention "квартира", "подселение" and a
# budget; only the verb separates them, and they become different things in the
# product:
#
#   LISTING   a place on offer   -> a `listings` row with a host profile
#   ROOMMATE  a person looking   -> a roommate profile in the /roommates directory
#
# Publishing the second as the first is the failure this distinction exists to
# prevent: it puts a student's request up as somebody's rental, with their phone
# number attached to a property they do not have.
DRAFT_LISTING = "listing"
DRAFT_ROOMMATE = "roommate"
DRAFT_UNKNOWN = "unknown"

_KIND_TO_DRAFT = {
    "offer": DRAFT_LISTING,
    "shared": DRAFT_LISTING,
    "seeking": DRAFT_ROOMMATE,
    "unknown": DRAFT_UNKNOWN,
}

# ---------------------------------------------------------------- confidence

# How sure the parser is, 0-100, as a sum of what it actually found. Not a
# probability and not calibrated against anything — it is a checklist with
# weights, which is the most an approach without a model can honestly claim.
#
# It exists for one decision: whether a draft may publish without a human
# reading it (see the listener's publish gate). So the weights are placed on the
# fields a reviewer would themselves check before approving — what is it, where
# is it, what does it cost, and who do I contact — rather than on how much text
# the post happened to contain.
CONFIDENCE_WEIGHTS: dict[str, int] = {
    "intent": 25,        # offer/shared/seeking established, not guessed
    "contact": 20,       # at least one way to reach the poster
    "price": 20,         # a stated price
    "location": 15,      # city AND something finer (ЖК, district or address)
    "property_type": 10, # apartment/house/dorm/studio
    "rooms": 5,
    "detail": 5,         # area, floor or capacity — corroborating specifics
}
MAX_CONFIDENCE = sum(CONFIDENCE_WEIGHTS.values())


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

    # Who the post wants, when it says so. None means "not stated" — which is
    # different from "anyone", and only the admin may turn one into the other.
    gender_preference: str | None = None
    student_only: bool = False
    roommate_wanted: int | None = None
    metro: str = ""

    listing_kind: str = "unknown"
    draft_kind: str = DRAFT_UNKNOWN
    confidence: int = 0
    confidence_parts: dict[str, int] = field(default_factory=dict)
    parser_version: str = PARSER_VERSION
    warnings: list[str] = field(default_factory=list)

    @property
    def has_contact(self) -> bool:
        """Any way at all to reach the poster."""
        return bool(self.contact_phone or self.contact_whatsapp or self.contact_telegram)

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
            "gender_preference": self.gender_preference,
            "student_only": self.student_only,
            "roommate_wanted": self.roommate_wanted,
            "metro": self.metro,
            "listing_kind": self.listing_kind,
            "draft_kind": self.draft_kind,
            "confidence": self.confidence,
            "parser_version": self.parser_version,
            "parser_output": asdict(self),
            "extraction_error": "; ".join(self.warnings) if self.warnings else None,
        }


def score_confidence(listing: ParsedListing) -> tuple[int, dict[str, int]]:
    """
    How much of what a reviewer would check did the parser actually establish.

    Returns the total and the per-component breakdown, because a bare number is
    not auditable: when a draft publishes automatically, the reason it cleared
    the bar has to be legible afterwards without re-running anything.

    Deliberately additive and deliberately blunt. Anything cleverer would imply
    a calibration this has no way to earn — there is no labelled corpus here,
    only rules, and a score that looks probabilistic invites trust it cannot
    support.
    """
    parts: dict[str, int] = {}
    w = CONFIDENCE_WEIGHTS

    if listing.listing_kind != "unknown":
        parts["intent"] = w["intent"]
    if listing.has_contact:
        parts["contact"] = w["contact"]
    if listing.price:
        parts["price"] = w["price"]
    # A city alone is not a location: every draft gets one from the source
    # default, so scoring it would hand free points to a post that named
    # nowhere at all.
    if listing.city and (listing.zhk or listing.district or listing.address):
        parts["location"] = w["location"]
    if listing.property_type:
        parts["property_type"] = w["property_type"]
    if listing.rooms:
        parts["rooms"] = w["rooms"]
    if listing.area or listing.floor or listing.capacity:
        parts["detail"] = w["detail"]

    return sum(parts.values()), parts


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
    if listing_kind == "unknown" and property_type and price.amount is not None:
        # Fallback: a post that names a property type AND a price, and asks for
        # nothing, is offering something. Plenty of hostel and dorm posts read
        # "Общежитие рядом с СДУ. 25 000 тг" with no renting verb at all, and
        # leaving those unclassified sends real inventory to the bottom of the
        # queue with a "needs a human" flag it does not need.
        listing_kind = "offer"
        warnings.append("intent inferred from a stated property type and price, not from the wording")
    draft_kind = _KIND_TO_DRAFT.get(listing_kind, DRAFT_UNKNOWN)
    if draft_kind == DRAFT_ROOMMATE:
        # Not a warning about a bad listing — a statement that this is a
        # different KIND of record. It becomes a roommate profile, not a
        # property, and the admin panel routes it accordingly.
        warnings.insert(0, "this is someone LOOKING for housing — it becomes a roommate profile, not a listing")
    elif draft_kind == DRAFT_UNKNOWN:
        warnings.insert(0, "could not tell whether this offers housing or asks for it — needs a human")

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
        gender_preference=E.extract_gender_preference(normalized),
        student_only=E.extract_student_only(normalized),
        roommate_wanted=E.extract_roommate_wanted(normalized),
        metro=E.extract_metro(normalized),
        listing_kind=listing_kind,
        draft_kind=draft_kind,
        warnings=warnings,
    )


def parse(
    text: str,
    *,
    sender: TelegramSender | None = None,
    default_city: str = "",
) -> ParsedListing:
    """
    `parse_message` plus its confidence score.

    Scoring reads the finished record rather than the text, so it stays a pure
    function of what was extracted — which is what makes the number reproducible
    from a stored draft without re-parsing.
    """
    listing = parse_message(text, sender=sender, default_city=default_city)
    listing.confidence, listing.confidence_parts = score_confidence(listing)
    return listing
