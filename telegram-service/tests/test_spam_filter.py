"""
The gate that decides what gets written down at all.

Two failure modes matter, and they pull in opposite directions:

  * Letting spam through costs a database row, a photo download, a storage
    object and an admin's attention.
  * Dropping a real post costs a listing that nobody will ever know was missed —
    strictly the worse of the two, and invisible.

So the tests below are asymmetric on purpose: the "must keep" set is made of
real posts, including the thinnest ones this service has actually received, and
is the set to be most careful about when tuning the weights.
"""

from __future__ import annotations

import pytest

from telegram_parser import classify, normalize_text
from telegram_parser.spam_filter import RecentContentFilter


def verdict(text: str, **kwargs):
    return classify(normalize_text(text), **kwargs)


# --- must be dropped ----------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "Куплю юсдт, жду ваши сообщения",
        "Продам USDT по выгодному курсу, крипта, p2p обмен",
        "Вакансия: требуются сотрудники на удаленную работу, 300к в месяц",
        "Курсы по программированию с нуля, обучение за 3 месяца",
        "Розыгрыш iPhone среди подписчиков! Подписывайтесь на канал",
        "Займы под 0%, кредит без отказа, деньги за 5 минут",
        "1xbet промокод на депозит, ставки на спорт",
        "Наращивание ресниц, маникюр недорого, записывайтесь",
        "Продам диван и холодильник, 50 000 тг, самовывоз",
    ],
)
def test_non_housing_adverts_are_dropped(text):
    assert verdict(text).keep is False


def test_an_empty_message_is_dropped_with_a_reason():
    result = verdict("")
    assert result.keep is False
    assert result.reason == "empty message"


def test_a_bot_is_dropped_before_anything_else_is_considered():
    result = verdict("Сдается 2-комнатная квартира, 200 000 тг", sender_is_bot=True)
    assert result.keep is False
    assert "bot" in result.reason


def test_a_link_dump_with_a_weak_housing_signal_is_dropped():
    text = "жильё https://a.example https://b.example https://c.example https://d.example"
    assert verdict(text).keep is False


def test_a_sale_post_is_not_a_rental():
    """Roomi lists rentals. "Продается квартира" is somebody else's business."""
    assert verdict("Продается 3-комнатная квартира, 25 млн тг").keep is False


# --- must be kept -------------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "Сдается 2-комнатная квартира рядом с SDU, 200 000 тг",
        "Ищу двух сожителей в жк алтын аул с сентября",
        "подселение в 2-комнатную, ищем девушку",
        "Қаскеленде жатақхана СДУ дан 600 метр қашықтықта орналасқан!",
        "ищу квартиру на подселение, бюджет до 90к",
        "общежитие рядом с университетом, 20 000 тг с человека",
        "Квартира болек вход",
    ],
)
def test_real_housing_posts_are_kept(text):
    assert verdict(text).keep is True, text


def test_the_thinnest_real_post_still_passes():
    """
    "Квартира болек вход" is 19 characters, has no price and no contact — and is
    a genuine album caption from SDU_housing. It sets the floor for the
    threshold: anything stricter starts eating inventory.
    """
    result = verdict("Квартира болек вход")
    assert result.keep is True
    assert result.score == 2


def test_a_photo_only_album_caption_survives_the_length_check():
    assert verdict("кв 2 ком", has_photos=True).keep is True


def test_a_rental_post_that_also_says_prodaetsya_is_still_judged_on_balance():
    text = "Сдается квартира в аренду, также продается мебель"
    assert verdict(text).keep is True


# --- the verdict itself -------------------------------------------------------


def test_the_verdict_explains_itself():
    result = verdict("Куплю юсдт, жду ваши сообщения")
    assert result.keep is False
    assert result.reason
    extra = result.as_log_extra()
    assert extra["spam_keep"] is False
    assert "юсдт" in extra["spam_negatives"]


def test_the_threshold_is_tunable_without_touching_the_code():
    text = "Квартира болек вход"
    assert verdict(text, min_score=2).keep is True
    assert verdict(text, min_score=5).keep is False


# --- repeated content ---------------------------------------------------------


def test_the_same_advert_reposted_is_caught():
    seen = RecentContentFilter(capacity=8)
    text = "Сдается квартира рядом с SDU, 200 000 тг"
    assert seen.is_repeat(text) is False
    assert seen.is_repeat(text) is True


def test_whitespace_differences_do_not_defeat_the_repeat_check():
    seen = RecentContentFilter(capacity=8)
    seen.is_repeat("Сдается  квартира\n\nрядом с SDU")
    assert seen.is_repeat("Сдается квартира рядом с SDU") is True


def test_different_posts_are_not_confused_for_each_other():
    seen = RecentContentFilter(capacity=8)
    seen.is_repeat("Сдается квартира рядом с SDU")
    assert seen.is_repeat("Сдается квартира рядом с КБТУ") is False


def test_the_cache_is_bounded():
    """
    An unbounded cache is a memory leak with a slow fuse, and this process is
    expected to stay up for weeks.
    """
    seen = RecentContentFilter(capacity=4)
    for index in range(20):
        seen.is_repeat(f"post number {index}")
    assert len(seen._seen) <= 4  # noqa: SLF001 - the bound IS the behaviour under test
