from app.extraction import RawExtraction, _parse_model_json, _to_number, validate_extraction
from app.media import _detect_image_type


def test_validate_extraction_defaults_bad_price_to_zero():
    raw = RawExtraction(is_rental_listing=True, title="Room", description="x", price="not a number")
    validated, warnings = validate_extraction(raw)
    assert validated.price == 0
    assert any("price" in w for w in warnings)


def test_validate_extraction_parses_price_string_with_currency_noise():
    raw = RawExtraction(is_rental_listing=True, title="Room", description="x", price="250 000 тг")
    validated, warnings = validate_extraction(raw)
    assert validated.price == 250000


def test_validate_extraction_clamps_absurd_price():
    raw = RawExtraction(is_rental_listing=True, title="Room", description="x", price=999_999_999)
    validated, warnings = validate_extraction(raw)
    assert validated.price < 999_999_999
    assert any("exceeds" in w for w in warnings)


def test_validate_extraction_drops_unrecognized_property_type():
    raw = RawExtraction(
        is_rental_listing=True, title="Room", description="x", property_type="mansion"
    )
    validated, warnings = validate_extraction(raw)
    assert validated.property_type is None
    assert any("property_type" in w for w in warnings)


def test_validate_extraction_accepts_valid_property_type():
    raw = RawExtraction(is_rental_listing=True, title="Room", description="x", property_type="APARTMENT")
    validated, _ = validate_extraction(raw)
    assert validated.property_type == "apartment"


def test_validate_extraction_flags_listing_with_no_content():
    raw = RawExtraction(is_rental_listing=True, title="", description="")
    _, warnings = validate_extraction(raw)
    assert any("no title/description" in w for w in warnings)


def test_validate_extraction_defaults_currency_to_kzt():
    raw = RawExtraction(is_rental_listing=True, title="Room", description="x", currency="")
    validated, _ = validate_extraction(raw)
    assert validated.currency == "KZT"


def test_to_number_handles_none_and_garbage():
    assert _to_number(None) is None
    assert _to_number("abc") is None
    assert _to_number("3.5") == 3.5
    assert _to_number(5) == 5.0


def test_parse_model_json_strips_code_fence():
    text = '```json\n{"title": "x"}\n```'
    assert _parse_model_json(text) == {"title": "x"}


def test_parse_model_json_plain():
    assert _parse_model_json('{"a": 1}') == {"a": 1}


def test_detect_image_type_jpeg():
    assert _detect_image_type(b"\xff\xd8\xff\xe0\x00\x10JFIF") == "image/jpeg"


def test_detect_image_type_png():
    assert _detect_image_type(b"\x89PNG\r\n\x1a\n\x00\x00") == "image/png"


def test_detect_image_type_webp():
    data = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 4
    assert _detect_image_type(data) == "image/webp"


def test_detect_image_type_rejects_unknown():
    assert _detect_image_type(b"not an image") is None
