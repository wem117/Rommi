"""
Compiled regexes and keyword tables — the whole vocabulary of the parser.

Everything the parser knows about Kazakhstani rental posts lives here as data,
so adding a new ЖК, a new spam phrase or a new way of writing "50 thousand" is
an edit to a table rather than a change to control flow.

Three things about these posts drive the implementation and are easy to get
wrong. The first two are inherited from the TypeScript parser this module is the
Python sibling of (src/lib/utils/post-parser.ts), which has been reading the
same posts in production for months:

 1. Labels bind by LINE, not by distance. "Стоимость: 150 000 ₸" followed on the
    next line by "Депозит: 75 000 ₸" puts the two numbers ~20 characters apart,
    so a proximity window reads the deposit as the rent. Every line is read on
    its own, which is also how a person reads the post.
 2. A field is emitted only when the text is unambiguous. A miss costs the admin
    one manual entry; a wrong guess puts a stranger's phone number, or somebody
    else's rent, on a live listing.
 3. Unlike JavaScript, Python's `re` treats Cyrillic as word characters, so `\\b`
    works on "тг" and "мың" directly and the `(?!\\p{L})` lookaheads the TS parser
    needs have no equivalent here. But `\\b` is a boundary BETWEEN a word and a
    non-word character, so it cannot terminate a token that already ends in one:
    `₸\\b` never matches "150 000 ₸ +", because both sides of that position are
    non-word. Every price in tenge-symbol notation was invisible until this was
    understood — units end with `(?!\\w)` ("not followed by a letter or digit"),
    which is the assertion actually wanted.

Patterns are compiled once at import. This module is imported by a worker that
runs for weeks on a 512 MB container, so nothing here allocates per message.
"""

from __future__ import annotations

import re

# Every pattern is matched against a lowercased copy of the message (see
# parser.normalize_text), which is length-preserving for Cyrillic and Latin
# alike — offsets into the normalized text stay valid for the original, which is
# what lets the money extractor reason about "before/after the deposit label".
# Patterns therefore never need re.IGNORECASE for Cyrillic, but keep it for the
# Latin ones so an untouched original can be matched too.

# --------------------------------------------------------------------- text

# Emoji and decorative dingbats. Posts are heavy with them ("🌿 Ищем девушек 🌿"),
# and they are noise in a title. Ranges rather than a library: one regex costs
# nothing and adding `emoji` as a dependency to strip four characters would not
# be a good trade on this VPS.
EMOJI_RE = re.compile(
    "[\U0001f000-\U0001faff"  # pictographs, symbols, transport, flags
    "\U00002600-\U000027bf"  # misc symbols + dingbats
    "\U00002190-\U000021ff"  # arrows
    "\U00002b00-\U00002bff"  # misc symbols and arrows
    "\U0000fe00-\U0000fe0f"  # variation selectors
    "\U0001f1e6-\U0001f1ff"  # regional indicators
    "\U000020e3\U0000203c\U00002049™ℹ©®]+",
    flags=re.UNICODE,
)

WHITESPACE_RE = re.compile(r"[ \t  ]+")
MULTI_NEWLINE_RE = re.compile(r"\n{3,}")

# --------------------------------------------------------------------- money

# 150 000 ₸ · 150000 тг · 300 000 тг · 20.000 теңге · 65 000 ₸
# The amount is deliberately greedy over spaces/dots/commas and stripped to
# digits afterwards: Kazakhstani posts use every separator there is, and none of
# them mean a decimal fraction at these magnitudes.
MONEY_UNIT_RE = re.compile(
    r"(?P<amount>\d[\d\s., ]{0,12}?)\s*(?P<unit>₸|тңг|тнг|тг|тенге|теңге|тeңге|kzt)(?!\w)"
)

# 200к · 200 к · 45к · 200 тыс · 180 тысяч · 140 мын · 140 мың
# Two to four digits only: a five-digit number followed by "к" is not "50000
# thousand", it is somebody's typo, and multiplying it would invent a price.
MONEY_THOUSANDS_RE = re.compile(
    r"(?P<amount>\d{1,4}(?:[.,]\d{1,2})?)\s*(?P<unit>к|k|тыс\.?|тысяч[аи]?|мың|мын)(?!\w)"
)

# A bare number, accepted ONLY on a line that says it is a price. Without that
# gate "8 707 803 92 90" and "70 м²" both look like money.
MONEY_BARE_RE = re.compile(r"(?<![\d.,])(?P<amount>\d{5,7})(?![\d.,])")

PRICE_CONTEXT_RE = re.compile(
    r"(цена|стоимость|стоит|аренда|арендная|оплата|платить|прайс|бюджет|ақысы|бағасы|"
    r"жалға|айына|в\s*месяц|per\s*month|month|rent|price)"
)

CURRENCY_BY_MARKER: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(\$|доллар|usd)"), "USD"),
    (re.compile(r"(€|евро|eur)"), "EUR"),
)

MIN_PLAUSIBLE_RENT = 10_000
MAX_PLAUSIBLE_RENT = 5_000_000

# ------------------------------------------------------------------- deposit

# "деп" needs the word boundary: "департамент", "депозит" (handled by the same
# alternation) and "депрессия" all start with it.
# Both boundaries on "деп" are load-bearing: the trailing one keeps
# "департамент" out, and the LEADING one keeps out the Kazakh "іздеп"
# ("looking for"), which ends in those exact three letters and appears in every
# other post from the Astana channel.
DEPOSIT_MARKER_RE = re.compile(r"(депозит\w*|\bдеп\b|залог\w*|кепілдік\w*|кепіл\b|deposit)")
# "первый месяц депозит", "возвратный депозит" — a deposit exists, amount unstated.
DEPOSIT_WITHOUT_AMOUNT_RE = re.compile(
    r"(первый\s+месяц\s+депозит|депозит\s+обязателен|возвратн\w*\s+депозит|с\s+депозитом|депозитпен)"
)
NO_DEPOSIT_RE = re.compile(r"(без\s+депозит\w*|депозит\s*(?:не\s*нужен|нет|жоқ)|депозитсіз|no\s+deposit)")

# ----------------------------------------------------------------- utilities

# "+ коммуналка", "150к + ком услуги", "плюс коммунальные"
UTILITIES_EXTRA_RE = re.compile(
    r"((?:\+|плюс|сверху|отдельно|бөлек|separately)\s*(?:за\s*)?"
    r"(?:комм?унал\w*|ком\.?\s*услуг\w*|ку\b|utilities)"
    r"|комм?унал\w*\s*(?:отдельно|сверху|не\s*включ\w*|бөлек)"
    r"|\+\s*ку\b)"
)
UTILITIES_INCLUDED_RE = re.compile(
    r"((?:комм?унал\w*|ком\.?\s*услуг\w*)[^.\n]{0,30}?(?:включ\w*|входят|входит|кіреді|ішінде|ишинде|кирет)"
    r"|(?:включая|вместе\s+с|с\s+учет\w*)\s+(?:комм?унал\w*|ком\.?\s*услуг\w*)"
    r"|бесплатн\w*[^.\n]{0,40}?комм?унал\w*"
    r"|комм?унал\w*[^.\n]{0,20}?бесплатн\w*"
    r"|все\s+включ\w*|всё\s+включ\w*|all\s+inclusive)"
)

# --------------------------------------------------------------------- rooms

# "2-комнатная", "2х комнатный", "2-ухкомнатную", "3 комнатная".
DIGIT_ROOMS_RE = re.compile(r"(?<!\d)(\d)\s*[-–—]?\s*(?:ух|х|x)?\s*[-–—]?\s*комнат")
WORD_ROOMS: tuple[tuple[str, int], ...] = (
    ("однокомнат", 1),
    ("1-комнат", 1),
    ("двухкомнат", 2),
    ("двух-комнат", 2),
    ("трехкомнат", 3),
    ("трёхкомнат", 3),
    ("четырехкомнат", 4),
    ("четырёхкомнат", 4),
    ("пятикомнат", 5),
)
# Kazakh: "2 бөлмелі", "бир болмели", "3 болмели"
KZ_ROOMS_RE = re.compile(r"(?<!\d)(\d)\s*[-–—]?\s*(?:бөлмел|болмел|бөлме|болме)")
KZ_WORD_ROOMS: tuple[tuple[str, int], ...] = (
    ("бір бөлмел", 1),
    ("бир болмел", 1),
    ("екі бөлмел", 2),
    ("еки болмел", 2),
    ("үш бөлмел", 3),
    ("уш болмел", 3),
)

# ------------------------------------------------------------- property type

# Ordered: the first match wins, so the most specific type is listed first.
# "общежитие" beats "комната" beats "квартира" — a dorm post also says "комната".
PROPERTY_TYPE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("dorm", re.compile(r"(общежит\w*|общаг\w*|жатақхана\w*|жатакхана\w*|dormitor\w*|hostel)")),
    ("studio", re.compile(r"(студи[ияю]\b|studio|кухня[- ]студия|смарт[- ]квартир\w*)")),
    # A bare "дом" is not enough — "в доме есть лифт" and "5-этажный дом"
    # describe the building a flat is in. Only a verb that rents out the whole
    # house counts.
    (
        "house",
        re.compile(
            r"(частн\w+\s+дом|коттедж\w*|таунхаус\w*|особняк\w*|жеке\s+үй"
            r"|сда[юё]?тся\s+дом|сдается\s+дом|сдам\s+дом|дом\s+в\s+аренду|весь\s+дом\s+целиком)"
        ),
    ),
    ("apartment", re.compile(r"(квартир\w*|пәтер\w*|патер\w*|\bкв\.?(?!\w)|apartment|flat)")),
)

# ---------------------------------------------------------------------- area

AREA_RE = re.compile(
    r"(?<![\d.,])(?P<amount>\d{1,4}(?:[.,]\d{1,2})?)\s*"
    r"(?:м\s*[²2]|кв\.?\s*м\b|шаршы\s*метр|m\s*[²2]|sqm)"
)
MIN_PLAUSIBLE_AREA = 5.0
MAX_PLAUSIBLE_AREA = 2000.0

# --------------------------------------------------------------------- floor

# "6/9 этаж" and "6 из 9 этажей" carry both numbers at once.
FLOOR_OF_TOTAL_RE = re.compile(r"(?<!\d)(\d{1,3})\s*(?:/|из|из\s+)\s*(\d{1,3})\s*этаж")
FLOOR_RE = re.compile(r"(?<!\d)(\d{1,3})\s*(?:-?[ыий]?й?)?\s*этаж(?!н)")
FLOOR_LABEL_RE = re.compile(r"этаж\s*[-:—]?\s*(\d{1,3})(?!\d)")
# "5 этажный дом" is the building's height, not the flat's floor.
TOTAL_FLOORS_RE = re.compile(r"(?<!\d)(\d{1,3})\s*[-–—]?\s*этажн\w*")
KZ_FLOOR_RE = re.compile(r"(?<!\d)(\d{1,3})\s*[-–—]?\s*(?:қабат|кабат)")
MAX_PLAUSIBLE_FLOOR = 200

# ------------------------------------------------------------------ capacity

# "будем жить втроем", "планируем жить вчетвером"
COLLECTIVE_NUMBERS: tuple[tuple[str, int], ...] = (
    ("вдвоем", 2), ("вдвоём", 2), ("екеу", 2),
    ("втроем", 3), ("втроём", 3), ("үшеу", 3), ("ушеу", 3),
    ("вчетвером", 4), ("төртеу", 4), ("тортеу", 4),
    ("впятером", 5), ("бесеу", 5),
    ("вшестером", 6), ("алтау", 6),
)
# "нужен пятый человек" — the ordinal names the headcount being completed.
ORDINAL_PEOPLE_RE = re.compile(
    r"(второй|третий|третья|четвертый|четвёртый|четвертая|пятый|пятая|шестой|шестая)\s+"
    r"(?:человек|жилец|сосед\w*|девушк\w*|парен\w*|адам)"
)
ORDINAL_VALUES: dict[str, int] = {
    "второй": 2, "третий": 3, "третья": 3,
    "четвертый": 4, "четвёртый": 4, "четвертая": 4,
    "пятый": 5, "пятая": 5, "шестой": 6, "шестая": 6,
}
# "до 5 человек", "4 девушки", "3-местные комнаты", "на 2 человека"
CAPACITY_COUNT_RE = re.compile(
    r"(?:до|на|для)?\s*(?<!\d)(\d{1,2})\s*"
    r"(?:человек\w*|жильц\w*|студент\w*|девушк\w*|парн\w*|адам\w*|сосед\w*|person|people)"
)
CAPACITY_PLACES_RE = re.compile(r"(?<!\d)(\d{1,2})\s*[-–—]?\s*(?:местн\w*|орынд\w*|орын\b)")
MAX_PLAUSIBLE_CAPACITY = 20

# ------------------------------------------------------------------ contacts

# Kazakhstani mobile numbers in the shapes people actually type:
# +7 700 123 45 67 · 8(700)1234567 · 87001234567 · 7 701 234-56-78 · 87477776642
PHONE_RE = re.compile(r"(?:\+?7|8)[\s\-(.]{0,3}\d{3}[\s\-).]{0,3}\d{3}[\s\-.]{0,3}\d{2}[\s\-.]{0,3}\d{2}")

WHATSAPP_LINK_RE = re.compile(r"(?:https?://)?(?:api\.)?wa\.me/(\+?\d{10,15})", re.IGNORECASE)
WHATSAPP_WORDS_RE = re.compile(r"(whats\s?app|ватс\s?ап|вотсап|вацап|уатсап|wa\.me|вотс\s?ап)", re.IGNORECASE)

TELEGRAM_LINK_RE = re.compile(r"(?:https?://)?(?:t\.me|telegram\.me)/(?:joinchat/)?([a-zA-Z0-9_]{4,32})", re.IGNORECASE)
# A bare @handle. The leading class stops it matching the @ inside an e-mail.
AT_HANDLE_RE = re.compile(r"(?:^|[\s(,;:\[])@([a-zA-Z0-9_]{4,32})\b")
TELEGRAM_WORDS_RE = re.compile(r"(telegram|телеграм\w*|телега|тг\b|tg\b)", re.IGNORECASE)

# ------------------------------------------------------------------ location

CITY_ALIASES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(алмат[ыаие]|алма[- ]ат[аы]|almaty|алмата)"), "Almaty"),
    # Kaskelen has no entry of its own in CITIES; it is the satellite town SDU
    # sits in and every renter there treats it as Almaty. Mapped rather than
    # dropped so the draft arrives with a city the admin can accept as-is.
    (re.compile(r"(каскелен\w*|қаскелең\w*|қаскелен\w*)"), "Almaty"),
    (re.compile(r"(астан[аеы]|astana|нур[- ]?султан\w*|нұр[- ]?сұлтан\w*|целиноград)"), "Astana"),
    (re.compile(r"(шымкент\w*|shymkent|чимкент\w*)"), "Shymkent"),
    (re.compile(r"(караганд\w*|қарағанд\w*|karaganda)"), "Karaganda"),
    (re.compile(r"(актобе|ақтөбе|aktobe)"), "Aktobe"),
    (re.compile(r"(тараз|taraz)"), "Taraz"),
    (re.compile(r"(павлодар\w*|pavlodar)"), "Pavlodar"),
    (re.compile(r"(семей|semey)"), "Semey"),
    (re.compile(r"(усть[- ]каменогорск\w*|өскемен\w*|оскемен\w*|oskemen)"), "Oskemen"),
    (re.compile(r"(атырау\w*|atyrau)"), "Atyrau"),
    (re.compile(r"(костанай\w*|қостанай\w*|kostanay)"), "Kostanay"),
    (re.compile(r"(кокшетау\w*|көкшетау\w*|kokshetau)"), "Kokshetau"),
    (re.compile(r"(петропавловск\w*|petropavl\w*)"), "Petropavlovsk"),
    (re.compile(r"(туркестан\w*|түркістан\w*|turkistan)"), "Turkistan"),
    (re.compile(r"(уральск\w*|орал\b|oral\b)"), "Oral"),
    (re.compile(r"(кызылорда|қызылорда|kyzylorda)"), "Kyzylorda"),
    (re.compile(r"(талдыкорган\w*|талдықорған\w*|taldykorgan)"), "Taldykorgan"),
)

# Districts as the app spells them (src/lib/constants/districts.ts), keyed off
# how a post spells them.
DISTRICT_ALIASES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(алмалинск\w*|алмалы)"), "Almaly"),
    (re.compile(r"(бостандыкск\w*|бостандық\w*|бостандык\w*)"), "Bostandyk"),
    (re.compile(r"(медеуск\w*|медеу\b)"), "Medeu"),
    (re.compile(r"(ауэзовск\w*|ауезовск\w*|әуезов\w*|ауэзов\b)"), "Auezov"),
    (re.compile(r"(наурызбайск\w*|наурызбай\b)"), "Nauryzbay"),
    (re.compile(r"(турксибск\w*|турксиб\b)"), "Turksib"),
    (re.compile(r"(есильск\w*|есіл\b|есиль\b)"), "Esil"),
    (re.compile(r"(сарыаркинск\w*|сарыарка\w*|сарыарқа\w*)"), "Saryarka"),
    (re.compile(r"(байконурск\w*|байконыр\w*)"), "Baikonur"),
    (re.compile(r"(нуринск\w*|нура\b)"), "Nura"),
)

# Free-form district mentions the alias table does not know: "мкр Аксай",
# "микрорайон Самал", "Бостандыкский р-н".
#
# The leading `(?<!\w)` is load-bearing. Without it `р[- ]?н` matches the "рн"
# inside "о-рн-аласқан" ("located", in half the Kazakh posts we receive) and
# every one of them arrives with district "Аласқан".
DISTRICT_GENERIC_RE = re.compile(
    r"(?<!\w)(?:мкр\.?|микрорайон[е]?|р[- ]?н\.?|район[е]?|ауданы?)\s*[-:]?\s*"
    r"([А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІіA-Za-z][\w-]{2,24}(?:\s+\d{1,2})?)"
)

# ЖК / residential complex. Known names first — a lookup can never over-capture,
# and these four are most of Roomi's student inventory.
KNOWN_ZHK: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"алтын\s*аул\w*"), "Алтын Аул"),
    (re.compile(r"асыл\s*арман\w*"), "Асыл Арман"),
    (re.compile(r"алма\s*сити"), "Алма Сити"),
    (re.compile(r"шахристан\w*"), "Шахристан"),
    (re.compile(r"аккент\w*|ақкент\w*"), "Аккент"),
    (re.compile(r"нурлы\s*тау|нұрлы\s*тау"), "Нурлы Тау"),
    (re.compile(r"ауэзов\s*сити|әуезов\s*сити"), "Ауэзов Сити"),
    (re.compile(r"европа\s*палас"), "Европа Палас"),
)

# Generic "ЖК <Name>": up to three capitalised-or-not tokens, stopped by a
# preposition. Without the stop list "в жк алтын аул с сентября" captures
# "алтын аул с сентября" — a real failure on a real post from SDU_housing.
ZHK_GENERIC_RE = re.compile(
    r"(?:жк|тұрғын\s*үй\s*кешені|residential\s+complex)\s*[«\"']?\s*"
    r"([\w][\w-]*(?:\s+[\w][\w-]*){0,2})",
)
ZHK_STOP_WORDS = frozenset(
    {
        "с", "со", "на", "в", "во", "до", "от", "за", "по", "и", "или", "к", "у", "о", "об",
        "для", "около", "рядом", "возле", "напротив", "район", "районе", "мкр", "цена",
        "стоимость", "депозит", "сдается", "сдаётся", "сдаю", "сдам", "ищу", "ищем", "есть",
        "будем", "живем", "живём", "квартира", "квартире", "комната", "этаж", "тг", "тенге",
        "the", "at", "in", "for", "from",
    }
)

# Streets and landmarks: "ул. Розыбакиева", "проспект Абая", "Абая көшесі".
STREET_RE = re.compile(
    r"(?:ул\.?|улиц[аеы]|просп\.?|проспект[еа]?|пр\.|мкр\.?|бульвар|шоссе|даңғылы|көшесі|көш\.?)\s*"
    r"[-:]?\s*([А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІіA-Za-z][\w-]{2,28}(?:\s+\d{1,3}[а-яa-z]?)?)"
)
# "напротив Магнума", "10 минут до Mega", "рядом с метро Абая"
LANDMARK_RE = re.compile(
    r"(метро\s+[\w-]{3,20}|трц\s+[\w-]{3,20}|тц\s+[\w-]{3,20}|mega\s*[\w-]{0,15}|"
    r"магнум\w*|небольшой\s+рынок|барахолка)"
)

UNIVERSITY_ALIASES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(sdu|сду)\b|сулейман\s*демирел|суleyman"), "SDU University (Suleyman Demirel)"),
    (re.compile(r"\b(kbtu|кбту)\b|казахстанско[- ]британск\w*"), "Kazakh-British Technical University (KBTU)"),
    (re.compile(r"нархоз\w*|narxoz"), "Narxoz University"),
    (re.compile(r"\b(kimep|кимэп|кимеп)\b"), "KIMEP University"),
    (re.compile(r"\b(казну|kaznu)\b|аль[- ]фараби|әл[- ]фараби"), "Al-Farabi Kazakh National University"),
    (re.compile(r"\b(сатпаев\w*|satbayev|казнту|политех)\b"), "Satbayev University"),
    (re.compile(r"\b(almau|алмау|аму)\b"), "Almaty Management University (AlmaU)"),
    (re.compile(r"\b(iitu|мку|муит)\b"), "International IT University (IITU)"),
    (re.compile(r"\b(nu|назарбаев\s*университет\w*|nazarbayev)\b"), "Nazarbayev University"),
    (re.compile(r"\b(енu|ену|enu)\b|гумилев\w*|гумилёв\w*"), "L.N. Gumilyov Eurasian National University"),
    (re.compile(r"\b(туран|turan)\b"), "Turan University"),
    (re.compile(r"\b(казуму|kaznmu)\b|асфендияров\w*|мед\s*универ\w*"), "Kazakh National Medical University (Asfendiyarov)"),
)

# ----------------------------------------------------------------- amenities

# Values are the app's canonical amenity strings (src/lib/utils/amenities.ts):
# only these ten have translations and icons. Appliances the post mentions but
# the app has no canonical name for are emitted as plain English below — the UI
# renders an unknown amenity with a neutral check rather than dropping it.
AMENITY_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("WiFi", re.compile(r"(wi[\s-]?fi|вай[\s-]?фай|интернет\w*|ғаламтор|инет\b)")),
    ("Washing Machine", re.compile(r"(стиральн\w*\s*машин\w*|стиралк\w*|кир\s*жуғыш|washing\s*machine)")),
    ("AC", re.compile(r"(кондиционер\w*|кондей|сплит[- ]систем\w*|air\s*condition\w*|кондиционер)")),
    ("Kitchen", re.compile(r"(кухн[яеи]\w*|ас\s*үй|асхана|kitchen)")),
    (
        "Furnished",
        re.compile(
            r"(мебел[ьи]\w*|меблирован\w*|жиһаз\w*|жихаз\w*|кроват[ьи]\w*|шкаф\w*|диван\w*|"
            r"полност[ьи]ю\s+обстав\w*|furnished)"
        ),
    ),
    ("Parking", re.compile(r"(парковк\w*|паркинг\w*|гараж\w*|автостоянк\w*|parking)")),
    ("Security", re.compile(r"(камер[аы]\w*|видеонаблюден\w*|охран\w*|домофон\w*|консьерж\w*|қауіпсіздік|security)")),
    ("Balcony", re.compile(r"(балкон\w*|лоджи[яи]\w*|балкон|balcony)")),
    ("Hot Water", re.compile(r"(горяч\w*\s*вод\w*|ыстық\s*су|hot\s*water|бойлер\w*)")),
    ("Gym", re.compile(r"(спортзал\w*|тренажерн\w*|тренажёрн\w*|фитнес\w*|gym)")),
)

# Appliances with no canonical app amenity. Free text, but a FIXED string per
# concept so the same fridge never arrives spelled two ways.
EXTRA_AMENITY_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("Fridge", re.compile(r"(холодильник\w*|мұздатқыш\w*|тоңазытқыш\w*|fridge|refrigerator)")),
    ("Microwave", re.compile(r"(микроволновк\w*|микроволнов\w*\s*печ\w*|свч\b|microwave)")),
    ("TV", re.compile(r"(телевизор\w*|теледидар\w*|\btv\b|smart\s*tv)")),
    ("Elevator", re.compile(r"(лифт\w*|көтергіш|elevator)")),
)

MAX_AMENITIES = 20

# -------------------------------------------------------------- listing kind

# What the post is DOING, which is not the same as what it is about. A post
# looking for a flat and a post offering one both mention "квартира" and
# "подселение"; only the verb separates them, and publishing one as the other
# would put a student's "ищу жильё" up as a rental.
# The intervening-word allowance ("ищем 2-ухкомнатную квартиру") is what makes
# this usable on real posts, and the exclusion inside it is what keeps it safe:
# "ищем девушек в квартиру" is a room being OFFERED to a fourth flatmate, and
# the same allowance without the exclusion would read it as a search.
SEEKING_RE = re.compile(
    r"(ищ(?:у|ем|ут|ущ\w*)\s+"
    r"(?:(?!девушк|парн|парен|сосед|соседк|жильц|жилец|қыз|студент|адам|человек)[\w-]+\s+){0,3}"
    r"(?:квартир\w*|жиль\w*|комнат\w*|подселен\w*|вариант\w*)|"
    r"сниму\b|снимем\b|нужна\s+квартир\w*|нужно\s+жиль\w*|"
    # Kazakh, and deliberately anchored on a HOUSING noun: "қыздар іздейміз"
    # ("we're looking for girls") is a room being offered, and shares the verb.
    r"(?:үй|пәтер|бөлме|жатақхана|пәтерді)\s+(?:[\w-]+\s+){0,2}?(?:іздеп|іздей\w*|керек)|"
    r"looking\s+for\s+(?:a\s+)?(?:flat|apartment|room))"
)
OFFERING_RE = re.compile(
    r"(сдается|сдаётся|сдаю|сдам|сдаются|сдаются|аренда|арендую|жалға\s+берілед\w*|"
    r"пәтер\s+беріле\w*|беріледі|for\s+rent|rent\s+out|available)"
)
SHARED_RE = re.compile(
    r"(подселен\w*|совместн\w*\s+проживан\w*|ищем?\s+(?:девушк\w*|парн\w*|соседк\w*|сосед\w*|жильц\w*|"
    r"қыздар\w*|студент\w*)|сожител\w*|roommate|қыздар\s+іздей\w*|адам\s+керек|"
    r"керек\s+(?:қыз|адам)|нужен\s+(?:сосед\w*|жилец|пятый|четвертый|третий))"
)

# --------------------------------------------------------------- spam signals

# (pattern, weight). Weights are small integers on purpose: the decision is
# "does this look like housing at all", not a probability, and a scale anyone
# can hold in their head is one anyone can tune without re-deriving it.
POSITIVE_SIGNALS: tuple[tuple[re.Pattern[str], int], ...] = (
    (re.compile(r"(сдается|сдаётся|сдаются|сдаю\b|сдам\b|аренд\w*|жалға\s+берілед\w*|for\s+rent)"), 3),
    (re.compile(r"(подселен\w*|совместн\w*\s+проживан\w*|сожител\w*|roommate)"), 3),
    (re.compile(r"(общежит\w*|жатақхана\w*|жатакхана\w*|общаг\w*|dormitory)"), 3),
    (re.compile(r"(ищу\s+квартир\w*|ищу\s+жиль\w*|сниму\b|ищем\s+жильц\w*|ищу\s+соседк?\w*|"
                r"ищем\s+девушк\w*|ищем\s+парн\w*|іздейміз|іздеймін)"), 3),
    # "кв" abbreviated is how the terser album captions write it ("кв 2 ком",
    # "Квартира болек вход" — both real posts), and those captions are the ones
    # closest to the threshold.
    (re.compile(r"(квартир\w*|пәтер\w*|патер\w*|\bкв\.?(?!\w))"), 2),
    (re.compile(r"(комнат\w*|бөлме\w*|болме\w*|room\b)"), 2),
    (re.compile(r"(жк\b|тұрғын\s*үй)"), 2),
    (re.compile(r"(сосед\w*|соседк\w*|жилец|жильц\w*|қыздар\b)"), 2),
    (re.compile(r"(депозит\w*|\bдеп\b|комм?унал\w*|ком\.?\s*услуг\w*)"), 1),
    (re.compile(r"(цена|стоимость|оплата|ақысы|бағасы|бюджет)"), 1),
    (re.compile(r"(этаж\w*|қабат\w*|м\s*[²2](?!\w)|кв\.?\s*м(?!\w))"), 1),
    (re.compile(r"(мебел\w*|жиһаз\w*|wi[\s-]?fi|интернет\w*|кондиционер\w*|стиралк\w*)"), 1),
    (re.compile(r"\b(sdu|сду|kbtu|кбту|нархоз|narxoz|kimep|казну|назарбаев)\b"), 1),
    (re.compile(r"(заезд|заселен\w*|көшу|move[- ]in)"), 1),
)

NEGATIVE_SIGNALS: tuple[tuple[re.Pattern[str], int], ...] = (
    # Crypto — the single most common spam in these channels ("Куплю юсдт").
    (re.compile(r"(крипт\w*|usdt|юсдт|юздт|bitcoin|биткоин\w*|btc\b|эфириум|обмен\w*\s+валют\w*|"
                r"p2p\b|трейдинг\w*|инвестиц\w*|заработок\s+в\s+интернет\w*)"), 5),
    (re.compile(r"(вакансия|вакансии|требуются\s+сотрудник\w*|подработк\w*|работа\s+на\s+дому|"
                r"ищем\s+сотрудник\w*|资|hiring|job\s+offer)"), 4),
    (re.compile(r"(курс[ыао]\s+(?:по|английск\w*|программирован\w*|it\b)|обучен\w*\s+с\s+нуля|"
                r"репетитор\w*|вебинар\w*|марафон\w*\s+по)"), 4),
    (re.compile(r"(розыгрыш\w*|конкурс\w*\s+среди\s+подписчик\w*|giveaway|приз\w*\s+ждет)"), 4),
    (re.compile(r"(казино|ставк[иа]\s+на\s+спорт|букмекер\w*|1xbet|мостбет|промокод\w*\s+на\s+депозит)"), 5),
    (re.compile(r"(займ\w*\s+под|кредит\w*\s+без\s+отказ\w*|микрозайм\w*|рассрочк\w*\s+на\s+телефон)"), 4),
    # Goods and services, not housing. "продам квартиру" is caught here too:
    # Roomi lists rentals, and a sale post is not one.
    (re.compile(r"(продам\b|продаю\b|продается\s+(?!.*аренд)|продаётся\s+(?!.*аренд)|продаж[аеи]\b|"
                r"куплю\b|скупк\w*|на\s+продажу)"), 3),
    (re.compile(r"(наращивани\w*|маникюр\w*|массаж\w*|доставк\w*\s+еды|клинингов\w*\s+услуг\w*|"
                r"ремонт\s+телефон\w*|такси\s+недорого)"), 3),
    (re.compile(r"(подпис\w*\s+на\s+канал|подписывайтесь|переходи\s+по\s+ссылк\w*|жми\s+сюда|"
                r"реклам[аыу]\b|по\s+вопросам\s+рекламы)"), 2),
)

# A message that is mostly links and says nothing about housing.
URL_RE = re.compile(r"https?://\S+|www\.\S+|t\.me/\S+")
