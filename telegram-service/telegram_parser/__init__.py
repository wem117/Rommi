"""
Deterministic Telegram post parsing for Roomi.

Regex, keyword tables and string handling — no model, no API key, no quota, no
per-message cost, no network call. The whole package is pure Python with zero
third-party imports, so it can be exercised from a test, a REPL or a one-off
script without a Telegram session, a database or a container.

    from telegram_parser import classify, parse_message

    verdict = classify(normalize_text(post))   # cheap gate: is this housing?
    if verdict.keep:
        listing = parse_message(post, default_city="Almaty")
"""

from telegram_parser.extractors import normalize_text, tidy_text
from telegram_parser.parser import (
    DRAFT_LISTING,
    DRAFT_ROOMMATE,
    DRAFT_UNKNOWN,
    PARSER_VERSION,
    ParsedListing,
    TelegramSender,
    parse,
    parse_message,
    score_confidence,
)
from telegram_parser.publish_gate import (
    MediaOutcome,
    PublishDecision,
    PublishPolicy,
    decide,
)
from telegram_parser.spam_filter import RecentContentFilter, SpamVerdict, classify

__all__ = [
    "DRAFT_LISTING",
    "DRAFT_ROOMMATE",
    "DRAFT_UNKNOWN",
    "MediaOutcome",
    "PARSER_VERSION",
    "ParsedListing",
    "PublishDecision",
    "PublishPolicy",
    "RecentContentFilter",
    "SpamVerdict",
    "TelegramSender",
    "classify",
    "decide",
    "normalize_text",
    "parse",
    "parse_message",
    "score_confidence",
    "tidy_text",
]
