"""
The gate that decides whether a draft may go live unread.

This is the only code path in the service that can put a stranger's contact
details on a public page without a human looking first, so the tests are
written the pessimistic way round: the default case is that a post is HELD, and
each test establishes one specific reason it may or may not proceed.

The condition that matters most is the one no score can express — a roommate
search must never publish as a property listing, whatever its confidence.
"""

from __future__ import annotations

import pytest

from telegram_parser import (
    DRAFT_LISTING,
    DRAFT_ROOMMATE,
    MediaOutcome,
    PublishPolicy,
    decide,
    parse,
)
from telegram_parser.publish_gate import MIN_DESCRIPTION_LENGTH

# A post carrying everything the gate asks for: intent, price, contact, a real
# location, a property type and enough prose to be a listing rather than a
# caption.
COMPLETE_LISTING = """Сдается 2-комнатная квартира в ЖК Алтын Аул, рядом с SDU (Каскелен).

Квартира полностью меблирована: холодильник, стиральная машина, кондиционер,
Wi-Fi. Кухня отдельная, санузел раздельный, балкон застеклён.

💰 Цена: 250 000 тг в месяц + коммунальные услуги.
💳 Депозит: 100 000 тг.
📞 Звоните: +7 701 161 94 04"""

OPEN = PublishPolicy(enabled=True)


def test_a_complete_listing_publishes():
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    decision = decide(listing, policy=OPEN, spam_score=8)
    assert decision.publish is True, decision.blockers
    assert decision.status == "published"


def test_automatic_publishing_is_off_unless_switched_on():
    """
    The default has to be "no". Behaviour that publishes strangers' contact
    details unattended should arrive when an operator decides it should, not
    when a deploy lands.
    """
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    decision = decide(listing, policy=PublishPolicy(), spam_score=8)
    assert decision.publish is False
    assert "disabled" in decision.blockers[0]


def test_a_roommate_search_never_publishes_however_confident():
    """
    THE condition. A person asking for a room is not inventory, and no score
    may override that — publishing it would put their phone number on a
    property they do not have.
    """
    seeking = """Ищу квартиру на подселение с конца августа, желательно ближе к Нархозу.
    Бюджет до 90 000 тг в месяц. Девушка, 20 лет, студентка, чистоплотная,
    без вредных привычек. Пишите: +7 701 161 94 04"""
    listing = parse(seeking, default_city="Almaty")

    assert listing.draft_kind == DRAFT_ROOMMATE
    decision = decide(listing, policy=OPEN, spam_score=9)
    assert decision.publish is False
    assert any("not a property listing" in b for b in decision.blockers)


def test_an_unclassifiable_post_is_held():
    listing = parse("Квартира болек вход, есть все условия для проживания студентов рядом.", default_city="Almaty")
    decision = decide(listing, policy=OPEN, spam_score=3)
    assert decision.publish is False


def test_a_listing_with_no_contact_is_held():
    """
    Explicitly required: with no phone, no Telegram and no WhatsApp, the post
    goes to review rather than public — a listing nobody can answer is worse
    than one that waited a day.
    """
    listing = parse(COMPLETE_LISTING.replace("📞 Звоните: +7 701 161 94 04", ""), default_city="Almaty")
    assert listing.has_contact is False
    decision = decide(listing, policy=OPEN, spam_score=8)
    assert decision.publish is False
    assert "no contact method" in decision.blockers


def test_a_partially_uploaded_album_is_held():
    """
    The "never partially publish" rule. A draft missing two of its six photos
    is fine for a human to approve — they can see what they are approving — but
    it must not go live unread.
    """
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    decision = decide(listing, policy=OPEN, spam_score=8, media=MediaOutcome(attached=6, uploaded=4))
    assert decision.publish is False
    assert any("images uploaded" in b for b in decision.blockers)


def test_a_fully_uploaded_album_publishes():
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    decision = decide(listing, policy=OPEN, spam_score=8, media=MediaOutcome(attached=6, uploaded=6))
    assert decision.publish is True, decision.blockers


def test_a_post_with_no_images_at_all_is_not_treated_as_a_failed_upload():
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    assert decide(listing, policy=OPEN, spam_score=8, media=MediaOutcome(0, 0)).publish is True


def test_photos_can_be_made_mandatory():
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    policy = PublishPolicy(enabled=True, require_photos=True)
    assert decide(listing, policy=policy, spam_score=8, media=MediaOutcome(0, 0)).publish is False


def test_a_thin_description_is_held():
    listing = parse("Сдается квартира рядом с SDU. 200 000 тг. +77011619404", default_city="Almaty")
    decision = decide(listing, policy=OPEN, spam_score=8)
    assert decision.publish is False
    assert any(str(MIN_DESCRIPTION_LENGTH) in b for b in decision.blockers)


def test_a_weak_housing_signal_is_held_even_though_it_passed_the_spam_gate():
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    decision = decide(listing, policy=OPEN, spam_score=1, min_spam_score=2)
    assert decision.publish is False
    assert any("weak housing signal" in b for b in decision.blockers)


def test_the_confidence_threshold_is_enforced_and_tunable():
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    assert decide(listing, policy=PublishPolicy(enabled=True, min_confidence=200), spam_score=8).publish is False
    assert decide(listing, policy=PublishPolicy(enabled=True, min_confidence=50), spam_score=8).publish is True


def test_every_blocker_is_reported_not_just_the_first():
    """
    A decision that names one problem sends an operator round the loop again
    tomorrow for the next one.
    """
    listing = parse("Сдам", default_city="")
    decision = decide(listing, policy=OPEN, spam_score=0)
    assert len(decision.blockers) >= 3


def test_a_held_decision_names_pending_review():
    listing = parse("Сдам", default_city="")
    assert decide(listing, policy=OPEN, spam_score=0).status == "pending_review"


# --- confidence ---------------------------------------------------------------


def test_confidence_rewards_what_a_reviewer_would_check():
    complete = parse(COMPLETE_LISTING, default_city="Almaty")
    thin = parse("Сдается квартира", default_city="Almaty")
    assert complete.confidence > thin.confidence
    assert complete.confidence >= 75


def test_confidence_is_broken_down_so_a_decision_can_be_audited():
    listing = parse(COMPLETE_LISTING, default_city="Almaty")
    assert listing.confidence == sum(listing.confidence_parts.values())
    for part in ("intent", "contact", "price", "location", "property_type"):
        assert part in listing.confidence_parts


def test_a_default_city_alone_does_not_count_as_a_location():
    """
    Every draft gets a city from its source, so scoring the city on its own
    would hand free points to a post that named nowhere at all.
    """
    listing = parse("Сдается квартира, 200 000 тг, +77011619404", default_city="Almaty")
    assert "location" not in listing.confidence_parts


@pytest.mark.parametrize("text", ["", "🏠🏠🏠", "."])
def test_scoring_an_empty_post_does_not_raise(text):
    assert parse(text).confidence == 0
