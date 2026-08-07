"""
The deterministic parser, exercised against REAL posts.

Every fixture in POSTS is a verbatim message pulled from the four channels this
service actually watches (SDU_housing, kbtuhousing, Narxoz_housings,
astana_krysha). They are kept literal — emoji, typos, mixed Russian/Kazakh,
inconsistent spacing and all — because every one of those is a thing the parser
has to survive, and a tidied-up fixture would quietly stop testing the case it
was written for.

The parser has no network, no clock and no state, so all of this runs from
string literals in milliseconds.
"""

from __future__ import annotations

import pytest

from telegram_parser import classify, normalize_text, parse_message
from telegram_parser.extractors import (
    extract_amenities,
    extract_area,
    extract_capacity,
    extract_contacts,
    extract_floors,
    extract_listing_kind,
    extract_price,
    extract_property_type,
    extract_rooms,
    extract_utilities,
    extract_zhk,
    normalize_phone,
)


def N(text: str) -> str:
    """Every extractor takes normalized text; this keeps the tests honest about it."""
    return normalize_text(text)


# --- real production posts ----------------------------------------------------

ALTYN_AUL = """Ищу двух сожителей в жк алтын аул с сентября
Жить будем втроем
200 к + коммуналка и деп 50 к
Есть кондиционер , тостер , стиралка , сушительная машина , утюг , гладильная доска , фильтр для воды  , микроволновка"""

SDU_NEW_FLATS = """🏠 Новые квартиры в 2 минутах от SDU!

🎓 Перед началом учебного года спрос на жилье рядом с SDU традиционно высокий.

✨ Что вас ждет:
🛏️ До 3 человек в квартире
🛋️ Новая мебель и вся необходимая техника
🚗 Парковка для автомобиля
🛜wi-fi

💰 Стоимость: 150 000 ₸ + коммунальные услуги
💳 Депозит: 75 000 ₸ за комнату

📍До университета — всего 2 минуты пешком.

📞 Бронирование и подробности:
+77011619404"""

SHAKHRISTAN = """🌿 Ищем девушек для совместного проживания 🌿

📍 ЖК Шахристан

В просторную 2-комнатную квартиру с кухней-студией площадью 70 м² ищем 1 или 2 девушек.

Сейчас в квартире живут две девушки. Планируем жить втроем или вчетвером.

💰 Стоимость квартиры — 300 000 тг + коммунальные услуги (делятся поровну между всеми жильцами).

📍 До Mega Alma-Ata (ул. Розыбакиева) — 10 минут пешком.

🏡 Квартира полностью меблирована и оснащена всей необходимой бытовой техникой."""

KAZAKH_DORM = """Қаскеленде жатақхана СДУ дан 600 метр қашықтықта орналасқан!
1 студентке 20.000 теңге!
Байланыс номер ватсап 87477776642
Ватсапқа жазыңыздар!"""

KAZAKH_DORM_2 = (
    "СДУ касында общежитие бар, бир болмели, ишинде душ, туалет, кухня, спальня, "
    "оборудование тугел бар. Айына 140 мын, коммунальные услуги ишинде. 87078039290"
)

SEEKING_NARXOZ = """ищу квартиру на подселение с конца августа, желательно ближе к нархозу. бюджет до 90к

девушка 19 лет;
спокойная, чистоплотная, без вредных привычек."""

SEEKING_KAZAKH = "ЖК Арнаудан 1 или 2 бөлмелі үй іздеп жүрмін"

WHOLE_HOUSE = """🏡 Сдается дом 2024-го года в аренду рядом с SDU (Каскелен)!

Сдается весь дом целиком:
🔹 Площадь: 140 м²
🔹 5 комнат: 3 спальни + зал-коридор + просторная кухня
🔹 Полностью мебелирован — заезжай и живи 🛋️
🔹 Есть всё необходимое: стиральная машина, холодильник, вся мебель и техника
🔹 Wi-Fi

💰 Цена: 400 000 KZT/месяц + коммунальные услуги оплачивают жильцы

📞 Пишите/звоните в личку за подробностями!
+77475531063"""

CRYPTO_SPAM = "Куплю юсдт, жду ваши сообщения"

# Arrived live while the service was being verified, and caught three misses at
# once — see the tests referencing it below.
LIVE_SHARED_FLAT = """Здравствуйте! Ищем девушек. ❗️Можно на летнее время .❗️
Спокойных, без вредных привычек (не пьющих, не курящих).

🏠 3-комнатная квартира — в каждой комнате по 2 девушки.
🚪 Комнаты изолированные

✅ Есть Wi-Fi
✅ Холодильник, микроволновка, утюг, стиральная машина и др.

💰 Цена: 45 000 тг + депозит 10 000 тг (коммунальные услуги включены).
📍 Адрес: Алтын ауыл, 5 минут пешком до СДУ.

📞 Дополнительная информация: в личные сообщения или по телефону
8 700 112 96 94."""


# --- price --------------------------------------------------------------------


def test_thousands_shorthand_is_the_rent_and_the_deposit_is_not():
    """
    "200 к + коммуналка и деп 50 к" — one line, two amounts, opposite meanings.

    The deposit label sits BETWEEN them, which is the only thing distinguishing
    the two; a proximity window gets this backwards as often as right.
    """
    price = extract_price(N(ALTYN_AUL))
    assert price.amount == 200_000
    assert price.deposit_amount == 50_000
    assert price.deposit_required is True
    assert price.utilities_included is False


def test_tenge_symbol_prices_are_found():
    """
    Regression: `₸\\b` never matches. `\\b` is a boundary between a word and a
    non-word character, and both sides of "₸ +" are non-word — so every price
    written with the tenge symbol was silently invisible, on the single most
    common price format in these channels.
    """
    price = extract_price(N(SDU_NEW_FLATS))
    assert price.amount == 150_000
    assert price.deposit_amount == 75_000


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("цена 200к", 200_000),
        ("цена 200 к", 200_000),
        ("Стоимость 200000 тг", 200_000),
        ("цена: 200 тыс", 200_000),
        ("цена:180 тысяч", 180_000),
        ("65 000 ₸ в месяц", 65_000),
        ("45к + коммуналка", 45_000),
        ("150к + ком услуги", 150_000),
        ("1 студентке 20.000 теңге", 20_000),
        ("Айына 140 мын", 140_000),
        ("300 000 тг + коммунальные услуги", 300_000),
    ],
)
def test_price_formats_from_the_spec(text, expected):
    assert extract_price(N(text)).amount == expected


def test_price_is_not_read_out_of_an_area_a_floor_or_a_phone():
    """Every number in this post is something other than money."""
    text = N("2-комнатная 58 м², 6 этаж из 9. Звоните 87011234567")
    assert extract_price(text).amount is None


def test_the_largest_plausible_amount_wins():
    """A per-person share quoted beside the rent must not become the rent."""
    price = extract_price(N("Квартира 300 000 тг, по 100 000 тг с человека"))
    assert price.amount == 300_000


def test_an_implausibly_small_number_is_not_a_rent():
    assert extract_price(N("цена 500 тг")).amount is None


# --- deposit ------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "amount"),
    [
        ("деп 50к", 50_000),
        ("депозит 100000", 100_000),
        ("💳 Депозит: 75 000 ₸ за комнату", 75_000),
        ("депозит по 30к с человека", 30_000),
    ],
)
def test_deposit_amounts(text, amount):
    assert extract_price(N(text)).deposit_amount == amount


def test_a_price_at_the_end_of_a_sentence_is_still_found():
    """
    Regression: the bare-number rule rejected anything followed by punctuation,
    so "деп 100000." — a price at the end of a sentence, which is where prices
    usually are — was thrown away over the full stop.
    """
    price = extract_price(N("Сдается 1-комнатная, 250 000 тг, деп 100000. Метро рядом."))
    assert price.amount == 250_000
    assert price.deposit_amount == 100_000


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("цена 150000.", 150_000),
        ("цена 150000,", 150_000),
        ("цена 150000", 150_000),
        # Still not money: a decimal fraction, or the tail of a longer number.
        ("цена 150000,50", None),
        ("цена 1234567890", None),
    ],
)
def test_bare_price_boundaries(text, expected):
    assert extract_price(N(text)).amount == expected


def test_deposit_without_an_amount_is_still_recorded_as_required():
    price = extract_price(N("Первый месяц депозит, заезд с сентября"))
    assert price.deposit_required is True
    assert price.deposit_amount is None


def test_no_deposit_is_distinguished_from_unstated():
    assert extract_price(N("Сдается квартира без депозита")).deposit_required is False
    assert extract_price(N("Сдается квартира, 200 000 тг")).deposit_required is None


def test_kazakh_izdep_is_not_a_deposit():
    """
    Regression: `деп\\b` matches the last three letters of the Kazakh "іздеп"
    ("looking for"), so every Astana post asking for a flat claimed a deposit.
    """
    assert extract_price(N(SEEKING_KAZAKH)).deposit_required is None


# --- utilities ----------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "included"),
    [
        ("150 000 ₸ + коммунальные услуги", False),
        ("200к + коммуналка", False),
        ("150к + ком услуги", False),
        ("коммунальные услуги включены", True),
        ("коммунальные услуги ишинде", True),
        ("ком услуга ішіне кіреді", True),
        ("Бесплатный WiFi и коммунальные услуги", True),
        ("Сдается квартира на длительный срок", None),
    ],
)
def test_utilities(text, included):
    assert extract_utilities(N(text))[0] is included


def test_when_a_post_says_both_the_first_one_describes_the_price():
    text = N("Стоимость 150 000 ₸ + коммунальные услуги.\nВ здании бесплатные коммунальные для офисов")
    assert extract_utilities(text)[0] is False


# --- rooms / type / area / floor ----------------------------------------------


@pytest.mark.parametrize(
    ("text", "rooms"),
    [
        ("1-комнатная квартира", 1),
        ("2-комнатная", 2),
        ("3 комнатная", 3),
        ("однокомнатная", 1),
        ("двухкомнатная", 2),
        ("сдаются 2-х комнатные квартиры", 2),
        ("ищем 2-ухкомнатную квартиру", 2),
        ("2х Комнатный квартира", 2),
        ("70 м² болатын 2 бөлмелі пәтер", 2),
        ("общежитие бир болмели", 1),
        ("сдается квартира", None),
    ],
)
def test_rooms(text, rooms):
    assert extract_rooms(N(text)) == rooms


@pytest.mark.parametrize(
    ("text", "property_type"),
    [
        ("сдается 2-комнатная квартира", "apartment"),
        ("общежитие рядом с СДУ", "dorm"),
        ("жатақхана бар", "dorm"),
        ("сдается студия", "studio"),
        ("Сдается дом 2024-го года в аренду", "house"),
        ("хорошее место", None),
    ],
)
def test_property_type(text, property_type):
    assert extract_property_type(N(text)) == property_type


def test_a_flat_in_a_five_storey_building_is_not_a_house():
    """A bare "дом" describes the BUILDING a flat is in far more often than the let."""
    assert extract_property_type(N("2-комнатная квартира в 5-этажном доме")) == "apartment"


@pytest.mark.parametrize(("text", "area"), [("58 м²", 58.0), ("58м2", 58.0), ("площадью 70 м²", 70.0), ("140 м²", 140.0)])
def test_area(text, area):
    assert extract_area(N(text)) == area


def test_area_ignores_an_implausible_figure():
    assert extract_area(N("2 м2")) is None


@pytest.mark.parametrize(
    ("text", "floor", "total"),
    [
        ("6 этаж", 6, None),
        ("10 этаж", 10, None),
        ("этаж 5", 5, None),
        ("6/9 этаж", 6, 9),
        ("квартира в 5-этажном доме", None, 5),
        ("3 қабат", 3, None),
    ],
)
def test_floors(text, floor, total):
    assert extract_floors(N(text)) == (floor, total)


def test_a_floor_higher_than_the_building_is_dropped_rather_than_published():
    assert extract_floors(N("9 этаж, 5 этажный дом")) == (9, None)


# --- capacity -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "capacity"),
    [
        ("будем жить втроем", 3),
        ("Планируем жить втроем или вчетвером", 4),
        ("4 девушки", 4),
        ("нужен пятый человек", 5),
        ("до 5 человек", 5),
        ("3-местные комнаты", 3),
        ("До 3 человек в квартире", 3),
        ("сдается квартира", None),
    ],
)
def test_capacity(text, capacity):
    assert extract_capacity(N(text)) == capacity


def test_a_per_person_price_is_not_a_capacity_of_one():
    """"1 студентке 20.000 теңге" is a price per head in a dorm that sleeps dozens."""
    assert extract_capacity(N(KAZAKH_DORM)) is None


# --- contacts -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "normalized"),
    [
        ("+77011619404", "+77011619404"),
        ("87477776642", "+77477776642"),
        ("8 707 803 92 90", "+77078039290"),
        ("+7 777 002 88 19", "+77770028819"),
        ("77089500897", "+77089500897"),
        ("8(700)1234567", "+77001234567"),
    ],
)
def test_phone_normalization(raw, normalized):
    assert extract_contacts(raw).phone == normalized
    assert normalize_phone(raw) == normalized


def test_the_raw_phone_is_kept_beside_the_normalized_one():
    contacts = extract_contacts(KAZAKH_DORM)
    assert contacts.phone == "+77477776642"
    assert contacts.phone_raw == "87477776642"


def test_a_number_labelled_whatsapp_becomes_the_whatsapp_contact():
    contacts = extract_contacts(KAZAKH_DORM)
    assert contacts.whatsapp == "+77477776642"


def test_wa_me_links_are_read():
    contacts = extract_contacts("Пишите wa.me/77089500897 WhatsApp")
    assert contacts.whatsapp == "+77089500897"


def test_labels_bind_by_line_not_by_distance():
    """
    Two numbers twenty characters apart, one labelled. A proximity window
    assigns the WhatsApp label to the phone above it.
    """
    contacts = extract_contacts("Тел: 8 700 123 45 67\nWhatsApp: 8 747 765 43 21")
    assert contacts.phone == "+77001234567"
    assert contacts.whatsapp == "+77477654321"


def test_telegram_links_and_handles():
    assert extract_contacts("пишите https://t.me/roomi_admin").telegram == "roomi_admin"
    assert extract_contacts("пишите @roomi_admin").telegram == "roomi_admin"


def test_a_phone_number_in_a_t_me_link_is_not_a_username():
    """
    Verbatim from a real SDU post: "https://t.me/87089500897". Telegram
    usernames must contain a letter; storing this as one would put a dead
    @mention on the published listing.
    """
    contacts = extract_contacts("wa.me/77089500897 WhatsApp\n\nhttps://t.me/87089500897 Telegram")
    assert contacts.telegram == ""
    assert contacts.whatsapp == "+77089500897"


def test_an_email_address_is_not_a_telegram_handle():
    assert extract_contacts("напишите на roomi@example.com").telegram == ""


# --- location -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "zhk"),
    [
        ("в жк алтын аул с сентября", "Алтын Аул"),
        ("📍 ЖК Шахристан", "Шахристан"),
        ("квартира в ЖК Алма Сити (напротив Магнума)", "Алма Сити"),
        ("ЖК Асыл Арман, 3 подъезд", "Асыл Арман"),
        ("ЖК Арнаудан 1 или 2 бөлмелі", "Арнаудан"),
        ("сдается квартира", ""),
    ],
)
def test_zhk(text, zhk):
    assert extract_zhk(N(text)) == zhk


@pytest.mark.parametrize(
    "text",
    ["в жк алтын аул с сентября", "Адрес: Алтын ауыл, 5 минут до СДУ", "ЖК Алтын Ауыл"],
)
def test_the_same_complex_spelled_both_ways_lands_on_one_name(text):
    """
    аул / ауыл are the Russian and Kazakh spellings of the same word, and the
    same complex is written both ways in the same channel. Canonicalising means
    an admin filtering by ЖК sees one entry, not two.
    """
    assert extract_zhk(N(text)) == "Алтын Аул"


def test_an_explicitly_labelled_address_is_taken_at_its_word():
    """
    "Адрес: ..." names a complex or a district as often as a street, so
    STREET_RE never sees it — and the post is telling us outright.
    """
    parsed = parse_message("Сдается квартира.\nАдрес: Розыбакиева 100, рядом метро.")
    assert parsed.address == "Розыбакиева 100"


def test_zhk_capture_stops_at_a_preposition():
    """
    "в жк алтын аул с сентября" — without a stop list the name swallows the rest
    of the sentence and the draft arrives addressed to "Алтын Аул С Сентября".
    """
    assert extract_zhk(N("в жк арман с сентября")) == "Арман"


def test_cities_and_universities():
    parsed = parse_message(KAZAKH_DORM)
    # Kaskelen is the town SDU sits in; the app's city list has no entry for it
    # and every renter there treats it as Almaty.
    assert parsed.city == "Almaty"
    assert parsed.university == "SDU University"


def test_orналасқан_does_not_become_a_district():
    """
    Regression: `р[- ]?н` matched the "рн" inside the Kazakh "орналасқан"
    ("located"), so half the Kazakh posts arrived with district "Аласқан".
    """
    assert parse_message(KAZAKH_DORM).district == ""


def test_a_landmark_street_does_not_become_the_property_address():
    """The flat is in ЖК Шахристан; Розыбакиева is where the shopping centre is."""
    parsed = parse_message(SHAKHRISTAN)
    assert parsed.address == "ЖК Шахристан"


# --- amenities ----------------------------------------------------------------


def test_amenities_use_the_apps_own_canonical_names():
    found = extract_amenities(N(SDU_NEW_FLATS))
    assert "WiFi" in found
    assert "Furnished" in found
    assert "Parking" in found


def test_appliances_are_captured_even_without_a_canonical_amenity():
    found = extract_amenities(N(ALTYN_AUL))
    assert "AC" in found
    assert "Washing Machine" in found
    assert "Microwave" in found


@pytest.mark.parametrize(
    ("text", "amenity"),
    [
        ("есть камеры и охрана", "Security"),
        ("домофон", "Security"),
        ("холодильник", "Fridge"),
        ("телевизор", "TV"),
        ("балкон", "Balcony"),
        ("горячая вода круглосуточно", "Hot Water"),
        ("интернет проведен", "WiFi"),
    ],
)
def test_amenity_keywords(text, amenity):
    assert amenity in extract_amenities(N(text))


# --- intent -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "kind"),
    [
        (SEEKING_NARXOZ, "seeking"),
        (SEEKING_KAZAKH, "seeking"),
        ("ищем 2-ухкомнатную квартиру с ремонтом", "seeking"),
        ("Студенты, ищущие ближайшую квартиру к СДУ", "seeking"),
        (ALTYN_AUL, "shared"),
        (SHAKHRISTAN, "shared"),
        ("Ищу парня на подселение", "shared"),
        (WHOLE_HOUSE, "offer"),
        ("Сдаются новые квартиры в пяти минутах от СДУ", "offer"),
    ],
)
def test_listing_kind(text, kind):
    assert extract_listing_kind(N(text)) == kind


@pytest.mark.parametrize(
    "text",
    [
        "Ищем девушек в 3-комнатную квартиру",
        "Ищем девушку на подселение",
        "Ищем 2 девушек",
        "ищем парней в квартиру",
    ],
)
def test_the_genitive_plural_of_devushka_is_recognised(text):
    """
    Regression, found on a live post. "девушек" is the genitive plural of
    "девушка" and the stem loses its к — so `девушк\\w*` matches девушка,
    девушки, девушку and девушкам, and misses the one form these posts actually
    use. "Ищем девушек." — the opening line of a real listing — read as
    intent unknown.
    """
    assert extract_listing_kind(N(text)) == "shared"


def test_looking_for_flatmates_is_not_looking_for_a_flat():
    """
    "ищем девушек ... в квартиру" is a room being OFFERED. Reading it as a
    search would hide a real listing behind a "do not publish" warning.
    """
    assert extract_listing_kind(N("Ищем девушек для совместного проживания в квартиру")) == "shared"


def test_a_seeking_post_becomes_a_roommate_draft_not_a_listing():
    """
    The distinction the whole classification exists for: a person looking for a
    room becomes a roommate profile, and the reason is stated first so an admin
    opening the queue reads it before anything else.
    """
    parsed = parse_message(SEEKING_NARXOZ)
    assert parsed.listing_kind == "seeking"
    assert parsed.draft_kind == "roommate"
    assert "LOOKING for housing" in parsed.warnings[0]


# --- whole-message behaviour --------------------------------------------------


def test_the_description_preserves_the_original_post():
    parsed = parse_message(SHAKHRISTAN)
    assert "Планируем жить втроем или вчетвером." in parsed.description
    assert "ЖК Шахристан" in parsed.description


def test_the_title_is_the_posts_own_opening_line():
    assert parse_message(SHAKHRISTAN).title == "Ищем девушек для совместного проживания"
    assert parse_message(WHOLE_HOUSE).title == "Сдается дом 2024-го года в аренду рядом с SDU (Каскелен)"


def test_the_title_is_capped_and_never_cuts_a_word_in_half():
    parsed = parse_message("Сдается очень хорошая квартира " + "с прекрасным ремонтом " * 12)
    assert len(parsed.title) <= 141  # 140 + the ellipsis
    assert "  " not in parsed.title


def test_the_source_city_is_a_fallback_and_never_an_override():
    assert parse_message(SDU_NEW_FLATS, default_city="Astana").city == "Astana"
    # The post names Kaskelen, so the source default must lose.
    assert parse_message(KAZAKH_DORM, default_city="Astana").city == "Almaty"


def test_the_fallback_city_is_declared_in_the_warnings():
    parsed = parse_message(SDU_NEW_FLATS, default_city="Almaty")
    assert any("defaulted to Almaty" in warning for warning in parsed.warnings)


def test_missing_data_is_empty_rather_than_guessed():
    parsed = parse_message("Квартира болек вход")
    assert parsed.price is None
    assert parsed.rooms is None
    assert parsed.area is None
    assert parsed.floor is None
    assert parsed.capacity is None
    assert parsed.contact_phone == ""
    assert parsed.city == ""


def test_the_senders_handle_is_the_contact_of_last_resort():
    from telegram_parser import TelegramSender

    sender = TelegramSender(telegram_id=42, username="aigerim", display_name="Aigerim")
    assert parse_message(SHAKHRISTAN, sender=sender).contact_telegram == "aigerim"


def test_a_handle_in_the_post_outranks_the_senders_own():
    from telegram_parser import TelegramSender

    sender = TelegramSender(username="channel_bot")
    parsed = parse_message("Сдается квартира, пишите @real_landlord", sender=sender)
    assert parsed.contact_telegram == "real_landlord"


def test_the_draft_payload_carries_every_column_the_table_has():
    payload = parse_message(SDU_NEW_FLATS, default_city="Almaty").to_draft_payload()
    for column in (
        "title", "description", "city", "district", "zhk", "address", "university",
        "price", "currency", "rooms", "property_type", "area", "floor", "total_floors",
        "capacity", "amenities", "utilities_included", "utilities_note", "deposit_amount",
        "deposit_required", "deposit_note", "contact_phone", "contact_phone_raw",
        "contact_whatsapp", "contact_whatsapp_raw", "contact_telegram", "listing_kind",
        "parser_version", "parser_output", "extraction_error",
    ):
        assert column in payload, f"{column} missing from the draft payload"
    assert payload["price"] == 150_000
    assert payload["parser_output"]["capacity"] == 3


def test_the_payload_never_carries_a_status():
    """
    Publishing is a human action. If this function could set `status`, one
    careless call site would be all it took to auto-publish.
    """
    assert "status" not in parse_message(WHOLE_HOUSE).to_draft_payload()


def test_parsing_is_deterministic():
    """The point of the whole exercise: same text in, same draft out, always."""
    first = parse_message(SHAKHRISTAN, default_city="Almaty").to_draft_payload()
    second = parse_message(SHAKHRISTAN, default_city="Almaty").to_draft_payload()
    assert first == second


def test_an_empty_message_parses_without_raising():
    parsed = parse_message("")
    assert parsed.title == "Жильё"
    assert parsed.price is None


def test_a_message_that_is_only_emoji_parses_without_raising():
    assert parse_message("🏠🏠🏠").price is None


# --- the full pipeline on real posts ------------------------------------------


def test_altyn_aul_end_to_end():
    parsed = parse_message(ALTYN_AUL, default_city="Almaty")
    assert parsed.price == 200_000
    assert parsed.deposit_amount == 50_000
    assert parsed.utilities_included is False
    assert parsed.zhk == "Алтын Аул"
    assert parsed.capacity == 3
    assert parsed.listing_kind == "shared"
    assert parsed.city == "Almaty"


def test_whole_house_end_to_end():
    parsed = parse_message(WHOLE_HOUSE, default_city="Almaty")
    assert parsed.price == 400_000
    assert parsed.property_type == "house"
    assert parsed.rooms == 5
    assert parsed.area == 140.0
    assert parsed.contact_phone == "+77475531063"
    assert parsed.university == "SDU University"
    assert parsed.utilities_included is False


def test_kazakh_dorm_end_to_end():
    parsed = parse_message(KAZAKH_DORM_2, default_city="Almaty")
    assert parsed.property_type == "dorm"
    assert parsed.rooms == 1
    assert parsed.price == 140_000
    assert parsed.utilities_included is True
    assert parsed.contact_phone == "+77078039290"


def test_the_live_shared_flat_end_to_end():
    """The post that caught three misses at once, now pinned in full."""
    parsed = parse_message(LIVE_SHARED_FLAT, default_city="Almaty")
    assert parsed.price == 45_000
    assert parsed.deposit_amount == 10_000
    assert parsed.utilities_included is True
    assert parsed.rooms == 3
    assert parsed.listing_kind == "shared"          # was "unknown": девушек
    assert parsed.zhk == "Алтын Аул"                # was "":       ауыл
    assert parsed.address == "ЖК Алтын Аул"         # was "":       no street
    assert parsed.university == "SDU University"
    assert parsed.contact_phone == "+77001129694"
    assert "WiFi" in parsed.amenities
    assert "Washing Machine" in parsed.amenities


def test_every_real_post_that_should_be_kept_is_kept():
    """A guard against a spam-filter tweak quietly starting to eat inventory."""
    for post in (ALTYN_AUL, SDU_NEW_FLATS, SHAKHRISTAN, KAZAKH_DORM, KAZAKH_DORM_2, WHOLE_HOUSE):
        assert classify(N(post)).keep is True, post[:40]
    assert classify(N(CRYPTO_SPAM)).keep is False


def test_cardiff_kazakhstan_is_recognised_in_both_scripts():
    """
    The platform's first branch campus, and the first alias that has to survive
    being written in Cyrillic.

    Posts about it arrive as "Cardiff", "Кардифф", "Кардиффе", "Кардиффский" —
    Russian declines the borrowed name — so the alias matches the stem rather
    than any one spelling. The value it resolves TO is the canonical English
    name, because that is what `listings.university` stores and what the site's
    filters compare against; resolving to a Cyrillic form here would file the
    draft under a university the rest of the platform cannot find.
    """
    for text in (
        "Сдается квартира рядом с Cardiff University Kazakhstan, Астана",
        "Сдам 2-комнатную в 10 минутах от Кардиффа, Астана",
        "Ищу соседку, учусь в Кардиффском университете, Астана",
        "Room near CARDIFF university, Astana",
    ):
        parsed = parse_message(text)
        assert parsed.university == "Cardiff University Kazakhstan", text
        assert parsed.city == "Astana", text


def test_cardiff_alias_does_not_swallow_unrelated_words():
    """
    `\\bcardiff\\b` and not a bare substring: the aliases run over every post,
    and a pattern loose enough to fire on a fragment mislabels the ones it hits.
    """
    parsed = parse_message("Сдается квартира на улице Кардиган, Алматы")
    assert parsed.university != "Cardiff University Kazakhstan"


def test_every_university_alias_resolves_to_a_real_university():
    """
    The alias table's VALUES are not labels — they are written into
    `listings.university`, which the site filters with an exact string compare.

    This has already cost real inventory: the table used to emit
    "SDU University" while the universities table held
    "SDU University", and 21 imported listings ended up filed under a name no
    page could match. They were invisible from the SDU hub card, and because
    their `university` was non-empty they missed the city fallback too.

    The app's constants file is the shared source of truth both sides can see,
    so this reads it directly rather than restating the list here — a copy would
    just be a third thing to drift.
    """
    import re
    from pathlib import Path

    import pytest

    # Walk up rather than hardcoding a depth: CI runs this from a full checkout,
    # but the service is also tested from its own image, where the web app's
    # source is deliberately absent. Skipping there is correct — the guard's job
    # is to fail the repo-wide build, and CI always has the file.
    constants = None
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "src" / "lib" / "constants" / "universities.ts"
        if candidate.is_file():
            constants = candidate
            break
    if constants is None:
        pytest.skip("web app sources not present (service tested standalone)")

    names = set(re.findall(r'\{\s*name:\s*"([^"]+)",\s*city:', constants.read_text(encoding="utf-8")))
    # A regex that stops matching would otherwise turn this into a no-op that
    # passes forever.
    assert len(names) > 40, f"constants file did not parse ({len(names)} names); guard would pass vacuously"

    from telegram_parser import patterns

    unknown = sorted({value for _, value in patterns.UNIVERSITY_ALIASES if value not in names})
    assert not unknown, f"aliases resolve to universities the app does not have: {unknown}"


def test_amu_is_not_silently_claimed_by_almau():
    """
    "АМУ" means Astana Medical University in Astana and Almaty Management
    University in Almaty. The alias table has no city to disambiguate with, so
    the bare abbreviation must not resolve to either by accident.
    """
    assert parse_message("Сдам квартиру рядом с Almaty Management University").university == \
        "Almaty Management University (AlmaU)"
    assert parse_message("Бөлме Астана медицина университеті жанында").university == \
        "Astana Medical University"


def test_the_other_astana_and_almaty_universities_resolve():
    cases = {
        "Квартира рядом с Абылай хан университетом, Алматы":
            "Kazakh Ablai Khan University of International Relations and World Languages",
        "Комната возле КазНПУ имени Абая, Алматы":
            "Kazakh National Pedagogical University named after Abai",
        "Сдается рядом с Astana IT University":  "Astana IT University",
        "Квартира возле КазНАУ, Алматы":         "Kazakh National Agrarian Research University",
        "Бөлме Сейфуллин атындағы университет жанында, Астана":
            "S. Seifullin Kazakh Agrotechnical University",
    }
    for text, expected in cases.items():
        assert parse_message(text).university == expected, text
