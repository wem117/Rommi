"""
The post shapes a housing channel actually carries, and what each becomes.

The importer used to assume every post was a property listing. It is not: these
channels are half inventory and half people asking for it, and the two share
almost every keyword. This file pins one representative post per shape, taken
from or modelled closely on real traffic.
"""

from __future__ import annotations

import pytest

from telegram_parser import (
    DRAFT_LISTING,
    DRAFT_ROOMMATE,
    MediaOutcome,
    PublishPolicy,
    decide,
    normalize_text,
    parse,
)
from telegram_parser.extractors import (
    extract_gender_preference,
    extract_metro,
    extract_roommate_wanted,
    extract_student_only,
)

N = normalize_text
OPEN = PublishPolicy(enabled=True)


# --- A) property listings ------------------------------------------------------

APARTMENT = """Сдается 2-комнатная квартира в ЖК Асыл Арман, рядом с КБТУ.

Полностью меблирована, есть холодильник, стиральная машина, кондиционер и Wi-Fi.
Санузел раздельный, балкон застеклён, 6 этаж из 9.

Цена: 250 000 тг + коммунальные услуги. Депозит 100 000 тг.
Телефон: +7 701 161 94 04"""

ROOM = """Сдается комната в 3-комнатной квартире рядом с Нархозом.

В комнате есть кровать, шкаф и стол. Кухня общая, интернет проведён,
стиральная машина в квартире. Соседи — студенты, спокойные.

80 000 тг в месяц, коммунальные включены. Пишите @roomi_host"""

HOSTEL = """Общежитие в Каскелене, 600 метров от СДУ.

Комнаты на 2 и 3 человека, в каждой душ и туалет, кухня на этаже,
Wi-Fi по всему зданию, круглосуточная охрана и камеры.

Цена 25 000 тг с человека в месяц, коммунальные услуги включены.
Байланыс: 87477776642"""

SUBLEASE = """Ищем девушку на подселение в 2-комнатную квартиру, ЖК Алма Сити.

Сейчас живём вдвоём, нужна третья. Квартира с хорошим ремонтом, есть вся
техника: холодильник, микроволновка, стиральная машина, кондиционер.

150 000 тг на троих + коммуналка. Только студентки, без вредных привычек.
Телефон +7 707 904 27 25"""


@pytest.mark.parametrize(
    ("text", "expected_type"),
    [(APARTMENT, "apartment"), (ROOM, "apartment"), (HOSTEL, "dorm"), (SUBLEASE, "apartment")],
)
def test_property_posts_become_listing_drafts(text, expected_type):
    listing = parse(text, default_city="Almaty")
    assert listing.draft_kind == DRAFT_LISTING
    assert listing.property_type == expected_type


def test_an_apartment_listing_end_to_end():
    listing = parse(APARTMENT, default_city="Almaty")
    assert listing.price == 250_000
    assert listing.deposit_amount == 100_000
    assert listing.utilities_included is False
    assert listing.rooms == 2
    assert listing.floor == 6
    assert listing.total_floors == 9
    assert listing.zhk == "Асыл Арман"
    assert listing.university == "KBTU"
    assert listing.contact_phone == "+77011619404"
    assert "Washing Machine" in listing.amenities


def test_a_room_listing_end_to_end():
    listing = parse(ROOM, default_city="Almaty")
    assert listing.price == 80_000
    assert listing.utilities_included is True
    assert listing.contact_telegram == "roomi_host"
    assert listing.university == "Narxoz University"


def test_a_hostel_listing_end_to_end():
    listing = parse(HOSTEL, default_city="Almaty")
    assert listing.property_type == "dorm"
    assert listing.price == 25_000
    assert listing.utilities_included is True
    assert listing.contact_phone == "+77477776642"
    assert "Security" in listing.amenities
    # Kaskelen has no entry in the app's city list; every renter there treats it
    # as Almaty, and the draft arrives with a city the admin can accept as-is.
    assert listing.city == "Almaty"


def test_a_sublease_end_to_end():
    listing = parse(SUBLEASE, default_city="Almaty")
    assert listing.draft_kind == DRAFT_LISTING
    assert listing.listing_kind == "shared"
    assert listing.price == 150_000
    assert listing.zhk == "Алма Сити"
    assert listing.gender_preference == "female"
    assert listing.student_only is True


# --- B) roommate searches ------------------------------------------------------

SEEKING_FLAT = """Ищу квартиру на подселение с конца августа, желательно ближе к Нархозу.
Бюджет — до 90 000 тг в месяц.

О себе: девушка, 20 лет, студентка, чистоплотная, без вредных привычек.
Пишите @student_kz"""

SEEKING_ROOMMATE = """Ищем ещё одного человека в 3-комнатную квартиру рядом с SDU.
Нас двое, нужен третий. 60 000 тг с человека."""

SEEKING_ROOM = """Ищу комнату или место в общежитии рядом с КБТУ.
Студент, 19 лет. Бюджет до 60 000 тг. +7 707 904 27 25"""

SEEKING_KAZAKH = "ЖК Арнаудан 1 или 2 бөлмелі үй іздеп жүрмін"


@pytest.mark.parametrize("text", [SEEKING_FLAT, SEEKING_ROOM, SEEKING_KAZAKH])
def test_searches_become_roommate_drafts(text):
    """
    The distinction the whole classification exists for. These publish as
    profiles in the roommate directory, never as property listings.
    """
    listing = parse(text, default_city="Almaty")
    assert listing.draft_kind == DRAFT_ROOMMATE, listing.listing_kind


def test_a_search_never_publishes_as_a_listing_however_complete():
    listing = parse(SEEKING_FLAT, default_city="Almaty")
    decision = decide(listing, policy=OPEN, spam_score=9)
    assert decision.publish is False
    assert any("not a property listing" in blocker for blocker in decision.blockers)


def test_a_stated_budget_is_read_as_the_seekers_maximum():
    # It lands in maxBudget on the published profile, never as rent.
    assert parse(SEEKING_FLAT, default_city="Almaty").price == 90_000


def test_looking_for_a_flatmate_is_an_offer_not_a_search():
    """
    "Ищем ещё одного человека" is a room being offered to a third person, and
    reading it as a search would hide real inventory behind a warning.
    """
    listing = parse(SEEKING_ROOMMATE, default_city="Almaty")
    assert listing.draft_kind == DRAFT_LISTING
    assert listing.roommate_wanted == 1


# --- who the post is looking for ----------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Ищем девушку на подселение", "female"),
        ("Ищем парня в квартиру", "male"),
        ("Только для девушек", "female"),
        ("Қыздар іздейміз", "female"),
        # Both named, or neither: not stated, and the admin decides rather than
        # the parser writing a discriminatory filter onto somebody's listing.
        ("Ищем девушку или парня", None),
        ("Сдается 2-комнатная квартира", None),
        ("Без разницы, пол не важен", "any"),
    ],
)
def test_gender_preference(text, expected):
    assert extract_gender_preference(N(text)) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [("Только студенты", True), ("для студентов", True), ("Сдается квартира", False)],
)
def test_student_preference(text, expected):
    assert extract_student_only(N(text)) is expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("нужен ещё один человек", 1),
        ("ищем двух девушек", 2),
        ("нужен 1 человек", 1),
        ("требуются 2 жильца", 2),
        ("сдается квартира", None),
    ],
)
def test_roommate_count(text, expected):
    assert extract_roommate_wanted(N(text)) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("рядом метро Абая", "Абая"),
        ("5 минут до метро Алатау", "Алатау"),
        ("тихий двор", ""),
    ],
)
def test_metro(text, expected):
    assert extract_metro(N(text)) == expected


# --- typo tolerance ------------------------------------------------------------


def test_latin_lookalikes_inside_cyrillic_words_are_repaired():
    """
    Phones autocorrect into the wrong keyboard constantly. Without folding,
    a single Latin "а" hiding in "квартира" defeats every pattern in the parser.
    """
    typo = "Сдaётся 2-комнатная квaртирa в ЖК Алтын Аул. 250 000 тг. +77011619404"
    listing = parse(typo, default_city="Almaty")
    assert listing.property_type == "apartment"
    assert listing.rooms == 2
    assert listing.price == 250_000
    assert listing.listing_kind == "offer"


def test_transliterated_names_are_left_alone():
    """The fold must not mangle text that is legitimately Latin."""
    assert "alma city" in N("ЖК Alma City")
    assert "sdu" in N("рядом с SDU")


def test_elongated_letters_are_flattened():
    assert N("сдаётсяяя") == "сдаётся"
    # A real double is exactly two letters and must survive.
    assert N("длинный") == "длинный"


# --- deduplication -------------------------------------------------------------


def test_an_amenity_named_twice_is_listed_once():
    listing = parse("Есть wifi и интернет, стиральная машина и стиралка", default_city="Almaty")
    assert listing.amenities.count("WiFi") == 1
    assert listing.amenities.count("Washing Machine") == 1


def test_a_landmark_named_twice_is_listed_once():
    listing = parse("Рядом ТРЦ Мега, до ТРЦ Мега 5 минут", default_city="Almaty")
    assert len(listing.landmarks) == len(set(listing.landmarks))


# --- no contact ---------------------------------------------------------------


def test_a_listing_with_no_contact_at_all_is_held_for_review():
    """
    Explicitly required: no phone, no Telegram, no WhatsApp means it never
    becomes public on its own.
    """
    listing = parse(APARTMENT.replace("Телефон: +7 701 161 94 04", ""), default_city="Almaty")
    assert listing.has_contact is False
    assert decide(listing, policy=OPEN, spam_score=8).publish is False


def test_the_senders_handle_counts_as_a_contact():
    from telegram_parser import TelegramSender

    listing = parse(
        APARTMENT.replace("Телефон: +7 701 161 94 04", ""),
        sender=TelegramSender(username="landlord_kz", display_name="Aigerim"),
        default_city="Almaty"
    )
    assert listing.contact_telegram == "landlord_kz"
    assert listing.has_contact is True


# --- automatic publish vs pending review --------------------------------------


def test_a_complete_apartment_listing_can_publish_automatically():
    listing = parse(APARTMENT, default_city="Almaty")
    decision = decide(listing, policy=OPEN, spam_score=8, media=MediaOutcome(3, 3))
    assert decision.publish is True, decision.blockers


def test_a_post_with_no_price_still_publishes_when_everything_else_holds():
    """
    Price is optional by design — plenty of real posts say "цена в ЛС". It costs
    confidence rather than disqualifying the post outright.
    """
    no_price = APARTMENT.replace("Цена: 250 000 тг + коммунальные услуги.", "Цена в личные сообщения.")
    listing = parse(no_price, default_city="Almaty")
    assert listing.price is None
    lenient = PublishPolicy(enabled=True, min_confidence=listing.confidence)
    assert decide(listing, policy=lenient, spam_score=8).publish is True
