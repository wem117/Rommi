"""
One function per field. Each returns `None`/empty when the text does not say.

The rule every extractor here obeys: never guess. A missing price costs the
admin one keystroke in the review form; an invented one is a wrong number on a
published listing that a student then budgets around. Where a choice has to be
made between two readings, these functions prefer to return nothing.

They operate on the NORMALIZED text (lowercased, non-breaking spaces folded —
see `normalize_text`), except where the original casing is part of the output
(titles, addresses), which is passed in separately.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from telegram_parser import patterns as P

# ---------------------------------------------------------------- normalizing


# Latin letters that are visually identical to a Cyrillic one. Phones autocorrect
# into the wrong keyboard constantly, so "кvартира" and "пoдселение" — each with one
# Latin character hiding in a Cyrillic word — are ordinary, and every pattern in
# this parser misses both.
_HOMOGLYPHS = str.maketrans(
    {
        # Only genuine LOWERCASE lookalikes. "h"->"н" and "t"->"т" were here
        # and are not: those pairs only resemble each other in capitals, and
        # folding them corrupts ordinary words.
        "a": "а", "c": "с", "e": "е", "k": "к", "m": "м",
        "o": "о", "p": "р", "x": "х", "y": "у",
    }
)

_CYRILLIC = re.compile(r"[а-яёәғқңөұүһі]")
_LATIN = re.compile(r"[a-z]")
_WORD = re.compile(r"[^\W\d_]+")
# Three or more of the same letter in a row. Russian and Kazakh double letters
# are always exactly two, so a run of three is emphasis ("сдаётсяяя") and
# collapsing it to one cannot damage a real word.
_ELONGATED = re.compile(r"([^\W\d_])\1{2,}")


def _fold_word(match: "re.Match[str]") -> str:
    """Latin lookalikes -> Cyrillic, but only inside a word that is mostly Cyrillic."""
    word = match.group(0)
    if not _CYRILLIC.search(word) or not _LATIN.search(word):
        return word
    # A word has to be predominantly Cyrillic before its Latin characters are
    # assumed to be typos. Without that guard, a transliterated name like
    # "Alma City" or an acronym like "SDU" gets mangled into nonsense.
    if len(_CYRILLIC.findall(word)) <= len(_LATIN.findall(word)):
        return word
    return word.translate(_HOMOGLYPHS)


def normalize_text(text: str) -> str:
    """
    Lowercase, fold the space-like characters Telegram posts are full of, repair
    mixed-keyboard typos, and flatten elongated letters.

    Not a transliteration and deliberately not a ё->е fold: the pattern tables
    carry both spellings, and a fold here would silently disable every pattern
    written with the letter the author actually used.

    The two repairs are the cheapest typo tolerance available that cannot
    misfire. Neither guesses at a word: one substitutes characters that are
    visually IDENTICAL, and only inside a word already mostly in the other
    alphabet; the other removes repetition that no real word in either language
    contains.
    """
    if not text:
        return ""
    lowered = text.replace(" ", " ").replace(" ", " ").replace(" ", " ").lower()
    folded = _WORD.sub(_fold_word, lowered)
    return _ELONGATED.sub(r"\1", folded)


def tidy_text(text: str) -> str:
    """
    The original post with its runs of blank lines closed up — nothing else.

    Used for the draft's description, which the spec requires to preserve the
    original Telegram text. Emoji, line breaks, the author's phrasing and their
    typos all survive; an admin reading the draft sees the post.
    """
    if not text:
        return ""
    cleaned = P.MULTI_NEWLINE_RE.sub("\n\n", text.replace("\r\n", "\n").strip())
    return "\n".join(P.WHITESPACE_RE.sub(" ", line).rstrip() for line in cleaned.split("\n"))


# --------------------------------------------------------------------- money


@dataclass(frozen=True, slots=True)
class Money:
    value: int
    currency: str
    position: int
    raw: str


def _digits_to_int(raw: str) -> int | None:
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:  # pragma: no cover - unreachable for a digit-only string
        return None


def _thousands_to_int(raw: str) -> int | None:
    """'45' -> 45000, '1,5' -> 1500. Kazakhstani posts write both."""
    try:
        return int(round(float(raw.replace(",", ".")) * 1000))
    except ValueError:
        return None


def _currency_for(text: str) -> str:
    for pattern, code in P.CURRENCY_BY_MARKER:
        if pattern.search(text):
            return code
    return "KZT"


def money_in_line(line: str) -> list[Money]:
    """
    Every monetary amount on one line, with its offset.

    The offset is what lets the caller tell "200к + коммуналка и деп 50к" apart:
    the rent is written before the deposit label and the deposit after it. A
    proximity window cannot make that distinction, and gets the two backwards
    about as often as it gets them right.
    """
    currency = _currency_for(line)
    found: list[Money] = []
    claimed: list[tuple[int, int]] = []

    def overlaps(start: int, end: int) -> bool:
        return any(start < c_end and end > c_start for c_start, c_end in claimed)

    for match in P.MONEY_UNIT_RE.finditer(line):
        value = _digits_to_int(match.group("amount"))
        if value:
            found.append(Money(value, currency, match.start(), match.group(0).strip()))
            claimed.append(match.span())

    for match in P.MONEY_THOUSANDS_RE.finditer(line):
        if overlaps(*match.span()):
            continue
        value = _thousands_to_int(match.group("amount"))
        if value:
            found.append(Money(value, currency, match.start(), match.group(0).strip()))
            claimed.append(match.span())

    # A bare number is only money on a line that says one is coming. Without
    # that gate an area, a floor count and half a phone number all qualify.
    # A deposit label counts as such a line — "депозит 100000" names an amount
    # just as plainly as "цена 100000" does.
    if P.PRICE_CONTEXT_RE.search(line) or P.DEPOSIT_MARKER_RE.search(line):
        for match in P.MONEY_BARE_RE.finditer(line):
            if overlaps(*match.span()):
                continue
            value = _digits_to_int(match.group("amount"))
            if value:
                found.append(Money(value, currency, match.start(), match.group(0).strip()))
                claimed.append(match.span())

    found.sort(key=lambda m: m.position)
    return found


@dataclass(frozen=True, slots=True)
class PriceInfo:
    amount: int | None = None
    currency: str = "KZT"
    deposit_amount: int | None = None
    deposit_required: bool | None = None
    deposit_note: str = ""
    utilities_included: bool | None = None
    utilities_note: str = ""


def extract_price(normalized: str) -> PriceInfo:
    """
    Rent, deposit and who pays the utilities, read line by line.

    Rent is the LARGEST plausible non-deposit amount in the post. Posts quote a
    per-person share, a deposit and the rent within a few words of each other,
    and of those three the rent is reliably the biggest — "300 000 тг + комм."
    with "по 30к с человека" underneath is one flat at 300k, not a 30k one.
    """
    rent_candidates: list[Money] = []
    deposit_candidates: list[Money] = []
    deposit_note = ""

    for line in normalized.split("\n"):
        if not line.strip():
            continue

        no_deposit = P.NO_DEPOSIT_RE.search(line)
        deposit_marker = None if no_deposit else P.DEPOSIT_MARKER_RE.search(line)

        for money in money_in_line(line):
            if deposit_marker is not None and money.position > deposit_marker.start():
                deposit_candidates.append(money)
                if not deposit_note:
                    deposit_note = line.strip()[:200]
            else:
                rent_candidates.append(money)

    plausible = [m for m in rent_candidates if P.MIN_PLAUSIBLE_RENT <= m.value <= P.MAX_PLAUSIBLE_RENT]
    rent = max(plausible, key=lambda m: m.value) if plausible else None

    plausible_deposits = [m for m in deposit_candidates if 1_000 <= m.value <= P.MAX_PLAUSIBLE_RENT]
    deposit = max(plausible_deposits, key=lambda m: m.value) if plausible_deposits else None

    if P.NO_DEPOSIT_RE.search(normalized):
        deposit_required: bool | None = False
        deposit = None
        deposit_note = ""
    elif deposit is not None:
        deposit_required = True
    elif P.DEPOSIT_WITHOUT_AMOUNT_RE.search(normalized) or P.DEPOSIT_MARKER_RE.search(normalized):
        deposit_required = True
        if not deposit_note:
            match = P.DEPOSIT_MARKER_RE.search(normalized)
            deposit_note = match.group(0) if match else ""
    else:
        deposit_required = None

    utilities_included, utilities_note = extract_utilities(normalized)

    return PriceInfo(
        amount=rent.value if rent else None,
        currency=rent.currency if rent else _currency_for(normalized),
        deposit_amount=deposit.value if deposit else None,
        deposit_required=deposit_required,
        deposit_note=deposit_note[:200],
        utilities_included=utilities_included,
        utilities_note=utilities_note[:200],
    )


def extract_utilities(normalized: str) -> tuple[bool | None, str]:
    """
    Whether the quoted rent includes communal charges.

    Both phrasings can appear in one post ("300 000 + коммунальные" above a
    line about free wifi and utilities in the building). Whichever the author
    wrote FIRST is the one describing the price; the later one is a feature
    list.
    """
    extra = P.UTILITIES_EXTRA_RE.search(normalized)
    included = P.UTILITIES_INCLUDED_RE.search(normalized)

    if extra and included:
        if extra.start() <= included.start():
            return False, extra.group(0).strip()
        return True, included.group(0).strip()
    if extra:
        return False, extra.group(0).strip()
    if included:
        return True, included.group(0).strip()
    return None, ""


# --------------------------------------------------------------------- rooms


def extract_rooms(normalized: str) -> int | None:
    for needle, value in P.WORD_ROOMS:
        if needle in normalized:
            return value
    match = P.DIGIT_ROOMS_RE.search(normalized)
    if match:
        rooms = int(match.group(1))
        if 1 <= rooms <= 20:
            return rooms
    for needle, value in P.KZ_WORD_ROOMS:
        if needle in normalized:
            return value
    match = P.KZ_ROOMS_RE.search(normalized)
    if match:
        rooms = int(match.group(1))
        if 1 <= rooms <= 20:
            return rooms
    return None


def extract_property_type(normalized: str) -> str | None:
    """One of apartment/house/dorm/studio — the four the listings table accepts."""
    for property_type, pattern in P.PROPERTY_TYPE_PATTERNS:
        if pattern.search(normalized):
            return property_type
    return None


# ---------------------------------------------------------------------- area


def extract_area(normalized: str) -> float | None:
    for match in P.AREA_RE.finditer(normalized):
        try:
            area = float(match.group("amount").replace(",", "."))
        except ValueError:
            continue
        if P.MIN_PLAUSIBLE_AREA <= area <= P.MAX_PLAUSIBLE_AREA:
            return area
    return None


# --------------------------------------------------------------------- floor


def extract_floors(normalized: str) -> tuple[int | None, int | None]:
    """Returns (floor, total_floors); either may be None."""
    for pattern in (P.FLOOR_OF_TOTAL_RE, P.FLOOR_THEN_TOTAL_RE):
        match = pattern.search(normalized)
        if match:
            floor, total = int(match.group(1)), int(match.group(2))
            if 0 < floor <= total <= P.MAX_PLAUSIBLE_FLOOR:
                return floor, total

    floor = None
    for pattern in (P.FLOOR_RE, P.FLOOR_LABEL_RE, P.KZ_FLOOR_RE):
        found = pattern.search(normalized)
        if found:
            value = int(found.group(1))
            if 0 < value <= P.MAX_PLAUSIBLE_FLOOR:
                floor = value
                break

    total = None
    found_total = P.TOTAL_FLOORS_RE.search(normalized)
    if found_total:
        value = int(found_total.group(1))
        if 0 < value <= P.MAX_PLAUSIBLE_FLOOR:
            total = value

    # "5 этаж в 5 этажном доме" is consistent; "9 этаж, 5 этажный" is not, and
    # a contradiction is a reason to publish neither number rather than pick.
    if floor is not None and total is not None and floor > total:
        return floor, None
    return floor, total


# ------------------------------------------------------------------ capacity


def extract_capacity(normalized: str) -> int | None:
    """
    How many people the place is meant for.

    The maximum of everything stated: "планируем жить втроем или вчетвером" is
    an offer for a fourth, and "до 5 человек" is a ceiling. Both describe the
    number the flat can hold, which is what a searcher filters on.
    """
    candidates: list[int] = []

    for needle, value in P.COLLECTIVE_NUMBERS:
        if needle in normalized:
            candidates.append(value)

    for match in P.ORDINAL_PEOPLE_RE.finditer(normalized):
        value = P.ORDINAL_VALUES.get(match.group(1))
        if value:
            candidates.append(value)

    # Two and up. A stated "1" is almost never a capacity: "1 студентке 20.000
    # теңге" is a PER-PERSON price in a dorm that sleeps dozens, and recording
    # capacity=1 from it would be worse than recording nothing, which is what a
    # blank field honestly says.
    for pattern in (P.CAPACITY_COUNT_RE, P.CAPACITY_PLACES_RE):
        for match in pattern.finditer(normalized):
            value = int(match.group(1))
            if 2 <= value <= P.MAX_PLAUSIBLE_CAPACITY:
                candidates.append(value)

    return max(candidates) if candidates else None


# ------------------------------------------------- who the post is looking for


def extract_gender_preference(normalized: str) -> str | None:
    """
    "female", "male", "any" — or None when the post does not say.

    Only when UNAMBIGUOUS. A post mentioning a woman is not a requirement that
    the tenant be one, and a wrong reading here writes a discriminatory filter
    onto somebody else's listing. Both genders named, or neither, yields None
    and the admin decides.
    """
    if P.ANY_GENDER_RE.search(normalized):
        return "any"
    female = bool(P.FEMALE_ONLY_RE.search(normalized))
    male = bool(P.MALE_ONLY_RE.search(normalized))
    if female == male:
        return None
    return "female" if female else "male"


def extract_student_only(normalized: str) -> bool:
    return bool(P.STUDENT_ONLY_RE.search(normalized))


def extract_roommate_wanted(normalized: str) -> int | None:
    """
    How many people are being SOUGHT — not how many the place holds.

    "нужен ещё один человек" in a flat of four is a vacancy of one, and a
    searcher filtering on free places wants that number, not the four.
    """
    match = P.ROOMMATE_WANTED_RE.search(normalized)
    if not match:
        return None

    raw = match.group(1)
    if raw.isdigit():
        value = int(raw)
    else:
        value = next((v for k, v in P.WORD_COUNTS.items() if raw.startswith(k)), 0)
    return value if 1 <= value <= P.MAX_PLAUSIBLE_CAPACITY else None


def extract_metro(normalized: str) -> str:
    match = P.METRO_RE.search(normalized)
    if not match:
        return ""
    name = match.group(1).strip(" .,;:«»\"'")
    return _title_case_tokens(name)[:60] if len(name) >= 3 else ""


# ----------------------------------------------------------------- amenities


def extract_amenities(normalized: str) -> list[str]:
    """
    Canonical amenity names, in the app's own vocabulary.

    The ten in AMENITY_PATTERNS are the ones with translations and icons
    (src/lib/utils/amenities.ts). Appliances beyond those are emitted in
    English with a fixed spelling — the UI shows an unrecognised amenity with a
    neutral tick rather than dropping it, so the detail survives, and a fixed
    spelling means the same fridge never arrives written two ways.
    """
    found: list[str] = []
    for name, pattern in (*P.AMENITY_PATTERNS, *P.EXTRA_AMENITY_PATTERNS):
        # `not in found` rather than a set, so the declared order in the pattern
        # tables survives — the app groups amenities for display and an
        # arbitrary order would scramble the groups.
        if name not in found and pattern.search(normalized):
            found.append(name)
    return found[: P.MAX_AMENITIES]


# ------------------------------------------------------------------ contacts


@dataclass(frozen=True, slots=True)
class Contacts:
    phone: str = ""
    phone_raw: str = ""
    whatsapp: str = ""
    whatsapp_raw: str = ""
    telegram: str = ""


def normalize_phone(raw: str) -> str | None:
    """
    Kazakhstani mobile -> +7XXXXXXXXXX, or None if it is not one.

    Both the raw and the normalized form are stored: the normalized one is what
    tel:/wa.me links are built from, and the raw one is what the poster
    actually wrote, which is the version to show when someone disputes it.
    """
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits[0] in "78":
        digits = digits[1:]
    elif len(digits) == 10:
        pass
    else:
        return None
    # Kazakhstani mobile ranges are 7xx; a landline (e.g. 727…) is not a
    # contact a student can WhatsApp, but it is still a valid phone, so only
    # the length is enforced here.
    return f"+7{digits}"


def extract_contacts(text: str) -> Contacts:
    """
    Phones, WhatsApp and Telegram, bound to labels by LINE.

    "Тел: 8 700 …" with "WhatsApp: 8 747 …" underneath puts the two numbers
    twenty characters apart; a proximity window labels the phone as the
    WhatsApp. Reading each line on its own is both correct and how a person
    reads the post.
    """
    lines = text.split("\n")

    whatsapp_numbers: list[tuple[str, str]] = []
    plain_numbers: list[tuple[str, str]] = []

    for line in lines:
        is_whatsapp_line = bool(P.WHATSAPP_WORDS_RE.search(line))
        for match in P.PHONE_RE.finditer(line):
            raw = match.group(0).strip()
            number = normalize_phone(raw)
            if not number:
                continue
            bucket = whatsapp_numbers if is_whatsapp_line else plain_numbers
            if all(number != existing for existing, _ in bucket):
                bucket.append((number, raw))

    # An explicit wa.me link outranks anything inferred from a label.
    link_whatsapp: tuple[str, str] | None = None
    link_match = P.WHATSAPP_LINK_RE.search(text)
    if link_match:
        number = normalize_phone(link_match.group(1))
        if number:
            link_whatsapp = (number, link_match.group(1))

    phone, phone_raw = plain_numbers[0] if plain_numbers else (whatsapp_numbers[0] if whatsapp_numbers else ("", ""))

    if link_whatsapp:
        whatsapp, whatsapp_raw = link_whatsapp
    elif whatsapp_numbers:
        whatsapp, whatsapp_raw = whatsapp_numbers[0]
    elif phone and P.WHATSAPP_WORDS_RE.search(text):
        # WhatsApp named somewhere in the post and exactly one number in it:
        # the landlord means that number. This is the single most common shape
        # in these channels ("Байланыс номер ватсап 87477776642").
        whatsapp, whatsapp_raw = phone, phone_raw
    else:
        whatsapp, whatsapp_raw = "", ""

    # A Telegram username must contain a letter. Posts do write phone numbers
    # into t.me links ("https://t.me/87089500897" — verbatim, from a real SDU
    # post); that string is a phone, and storing it as a username would put a
    # dead @mention on the listing. The number is already captured above.
    telegram = ""
    for candidate in (
        (match.group(1) for match in P.TELEGRAM_LINK_RE.finditer(text)),
        (match.group(1) for match in P.AT_HANDLE_RE.finditer(text)),
    ):
        telegram = next((handle for handle in candidate if any(c.isalpha() for c in handle)), "")
        if telegram:
            break

    return Contacts(
        phone=phone,
        phone_raw=phone_raw,
        whatsapp=whatsapp,
        whatsapp_raw=whatsapp_raw,
        telegram=telegram.lstrip("@"),
    )


# ------------------------------------------------------------------ location


@dataclass(slots=True)
class Location:
    city: str = ""
    district: str = ""
    zhk: str = ""
    address: str = ""
    university: str = ""
    landmarks: list[str] = field(default_factory=list)


def _title_case_tokens(value: str) -> str:
    return " ".join(token[:1].upper() + token[1:] for token in value.split() if token)


def extract_zhk(normalized: str) -> str:
    """
    The residential complex, which in Kazakhstan is the address people use.

    Known names first: a lookup cannot over-capture, and a handful of complexes
    account for most student inventory. The generic "ЖК <name>" form then has to
    decide where the name ends, which is the whole difficulty — "в жк алтын аул
    с сентября" runs the name straight into the next clause. Capture stops at
    the first preposition, so it yields "Алтын Аул" rather than a sentence.
    """
    for pattern, canonical in P.KNOWN_ZHK:
        if pattern.search(normalized):
            return canonical

    match = P.ZHK_GENERIC_RE.search(normalized)
    if not match:
        return ""

    tokens: list[str] = []
    for token in match.group(1).split():
        token = token.strip("«»\"'.,;:()")
        if not token or token in P.ZHK_STOP_WORDS or token.isdigit():
            break
        tokens.append(token)

    name = _title_case_tokens(" ".join(tokens))
    return name if len(name) >= 3 else ""


def extract_location(normalized: str, original: str) -> Location:
    location = Location()

    for pattern, city in P.CITY_ALIASES:
        if pattern.search(normalized):
            location.city = city
            break

    for pattern, district in P.DISTRICT_ALIASES:
        if pattern.search(normalized):
            location.district = district
            break
    if not location.district:
        match = P.DISTRICT_GENERIC_RE.search(normalized)
        if match:
            candidate = match.group(1).strip(" .,;:")
            if candidate and candidate not in P.ZHK_STOP_WORDS:
                location.district = _title_case_tokens(candidate)[:120]

    location.zhk = extract_zhk(normalized)

    # The ЖК outranks any street the post mentions. In Kazakhstan the complex IS
    # the address people navigate by, and a street named in one of these posts is
    # usually a LANDMARK's ("до Mega Alma-Ata (ул. Розыбакиева) — 10 минут"),
    # not the property's — that exact post would otherwise be addressed to a
    # shopping centre three kilometres away.
    if location.zhk:
        location.address = f"ЖК {location.zhk}"
    else:
        street = P.STREET_RE.search(normalized)
        labelled = P.ADDRESS_LABEL_RE.search(normalized)
        if street:
            location.address = _title_case_tokens(street.group(0).strip(" .,;:"))[:300]
        elif labelled:
            # An author who writes "Адрес: ..." is telling us outright; there is
            # nothing left to infer, even when what follows is a complex or a
            # district rather than a street.
            location.address = _title_case_tokens(labelled.group(1).strip(" .,;:"))[:300]

    for pattern, university in P.UNIVERSITY_ALIASES:
        if pattern.search(normalized):
            location.university = university
            break

    # Deduplicated, order preserved. A post naming "Мега" three times is one
    # landmark, and a draft listing it three times reads as three.
    seen: set[str] = set()
    landmarks: list[str] = []
    for match in P.LANDMARK_RE.finditer(normalized):
        landmark = match.group(0).strip()
        if landmark and landmark not in seen:
            seen.add(landmark)
            landmarks.append(landmark)
    location.landmarks = landmarks[:5]

    # `original` is unused for now beyond keeping the signature honest about
    # what a future casing-sensitive rule would need; the address is rebuilt
    # from normalized text and re-cased above.
    del original
    return location


# ------------------------------------------------------------- listing kind


def extract_listing_kind(normalized: str) -> str:
    """
    What the post is DOING: offering a place, offering a share of one, or
    looking for one.

    This is the distinction that must not be got wrong. "Ищу квартиру на
    подселение" and "Сдается квартира, подселение" share almost every keyword,
    and publishing the first as the second puts a student's request up as
    somebody's rental. `seeking` is checked first for exactly that reason, and
    the admin panel shows it, so a request can never be approved by accident.
    """
    if P.SEEKING_RE.search(normalized):
        return "seeking"
    if P.SHARED_RE.search(normalized):
        return "shared"
    if P.OFFERING_RE.search(normalized):
        return "offer"
    return "unknown"


# --------------------------------------------------------------------- title

_TITLE_PROPERTY_WORDS = {
    "apartment": "Квартира",
    "house": "Дом",
    "dorm": "Общежитие",
    "studio": "Студия",
}
_SENTENCE_END_RE = re.compile(r"[.!?…]+(?:\s|$)")
MAX_TITLE_LENGTH = 140
MIN_USEFUL_TITLE = 10


def build_title(
    original: str,
    *,
    rooms: int | None = None,
    property_type: str | None = None,
    zhk: str = "",
    district: str = "",
    city: str = "",
) -> str:
    """
    The post's own opening line, cleaned — or a title built from the facts when
    the post has no usable one.

    Authors write good titles without being asked ("Ищем девушек для
    совместного проживания"); rewriting that into "2-комнатная квартира,
    Almaty" would lose what makes it findable. So the first line wins whenever
    it says anything, and synthesis is the fallback, not the default.
    """
    for raw_line in original.split("\n"):
        line = P.WHITESPACE_RE.sub(" ", P.EMOJI_RE.sub("", raw_line)).strip(" -–—•*·|,;:")
        if len(line) < MIN_USEFUL_TITLE:
            continue

        sentence = _SENTENCE_END_RE.split(line)[0].strip()
        if len(sentence) >= MIN_USEFUL_TITLE:
            line = sentence

        if len(line) > MAX_TITLE_LENGTH:
            line = line[:MAX_TITLE_LENGTH].rsplit(" ", 1)[0].rstrip(" ,;:-") + "…"
        return line

    parts: list[str] = []
    if rooms:
        parts.append(f"{rooms}-комнатная")
    parts.append(_TITLE_PROPERTY_WORDS.get(property_type or "", "Жильё"))
    where = zhk or district or city
    if where:
        parts.append(f"— {where}")
    return " ".join(parts)[:MAX_TITLE_LENGTH]
