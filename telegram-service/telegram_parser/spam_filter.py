"""
Deterministic spam / relevance gate, run BEFORE anything is written down.

The point is not classification for its own sake — it is that a message which
fails here costs one regex sweep and nothing else. No database row, no photo
download, no storage upload, no draft for an admin to dismiss by hand. On a
512 MB VPS watching four busy student channels, that difference is most of the
service's running cost.

Scoring, not a single rule: real posts are terse and inconsistent ("Квартира
болек вход" is a genuine listing; "Куплю юсдт" is not), and a single keyword
test either lets the second through or drops the first. Weighted signals from
patterns.py are summed and compared against a threshold that the operator can
move without touching this file.

No model, no network call, no learned weights — the verdict for a given text is
the same today as it will be in a year, and the reason is always quotable back
to the operator in the log line.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from telegram_parser.patterns import (
    NEGATIVE_SIGNALS,
    POSITIVE_SIGNALS,
    URL_RE,
)

# A message shorter than this carries no useful listing content even when it is
# about housing. Album captions are the reason it is not higher: "Квартира
# болек вход" is 19 characters and is a real post.
MIN_USEFUL_LENGTH = 12

# Sum of positive weights minus negative weights must reach this. 2 == one
# ordinary housing noun ("квартира", "комната"), which is deliberately the
# lowest bar that still excludes every non-housing message we have seen.
DEFAULT_MIN_SCORE = 2

# Links are normal in a listing ("wa.me/7700…"), a wall of them is not.
MAX_URLS_WITHOUT_HOUSING = 2


@dataclass(frozen=True, slots=True)
class SpamVerdict:
    """
    Why a message was kept or dropped, in a form that logs as one line.

    `keep` is the only field the caller branches on; the rest exist so the log
    can answer "why was my post ignored" without anybody re-running the filter
    by hand.
    """

    keep: bool
    score: int
    reason: str
    positives: tuple[str, ...] = ()
    negatives: tuple[str, ...] = ()

    def as_log_extra(self) -> dict[str, object]:
        return {
            "spam_keep": self.keep,
            "spam_score": self.score,
            "spam_reason": self.reason,
            "spam_positives": ",".join(self.positives[:6]),
            "spam_negatives": ",".join(self.negatives[:6]),
        }


def _matched(text: str, signals: Iterable[tuple], ) -> tuple[int, list[str]]:
    """Total weight plus the literal matched substrings, for the log line."""
    total = 0
    hits: list[str] = []
    for pattern, weight in signals:
        match = pattern.search(text)
        if match is None:
            continue
        total += weight
        hits.append(match.group(0).strip()[:24])
    return total, hits


def classify(
    text: str,
    *,
    has_photos: bool = False,
    sender_is_bot: bool = False,
    min_score: int = DEFAULT_MIN_SCORE,
) -> SpamVerdict:
    """
    Decides whether `text` is worth parsing and storing.

    `text` is expected to be already normalized (lowercased — see
    parser.normalize_text); passing raw text still works for the Cyrillic
    patterns but will miss the Latin-cased ones.

    `has_photos` matters because a photo-carrying message with a thin caption is
    still a listing an admin would want; a textless message with no photos is
    nothing at all.
    """
    stripped = text.strip()

    if not stripped:
        return SpamVerdict(False, 0, "empty message")

    if sender_is_bot:
        # Bots in these channels post channel statistics, invite links and
        # cross-promotions. None of it is inventory.
        return SpamVerdict(False, 0, "sender is a bot")

    if len(stripped) < MIN_USEFUL_LENGTH and not has_photos:
        return SpamVerdict(False, 0, f"message too short ({len(stripped)} chars) and has no photos")

    positive_score, positives = _matched(stripped, POSITIVE_SIGNALS)
    negative_score, negatives = _matched(stripped, NEGATIVE_SIGNALS)
    score = positive_score - negative_score

    if positive_score == 0:
        return SpamVerdict(False, score, "no housing signal found", (), tuple(negatives))

    url_count = len(URL_RE.findall(stripped))
    if url_count > MAX_URLS_WITHOUT_HOUSING and positive_score < 3:
        return SpamVerdict(
            False,
            score,
            f"link dump ({url_count} links) with only a weak housing signal",
            tuple(positives),
            tuple(negatives),
        )

    if score < min_score:
        return SpamVerdict(
            False,
            score,
            f"score {score} below threshold {min_score}",
            tuple(positives),
            tuple(negatives),
        )

    return SpamVerdict(True, score, "housing post", tuple(positives), tuple(negatives))


class RecentContentFilter:
    """
    Drops the same post arriving again — the "repeated spam messages" case.

    The database's (source, message_id) unique constraint already stops the SAME
    message being imported twice. This covers the other shape: an advertiser
    re-posting identical TEXT under a new message id, in a different channel, or
    every few hours. Those are distinct rows to the constraint and identical
    listings to a human.

    Bounded on purpose. A dict that only ever grows is a memory leak with a
    slow fuse, and this process is expected to stay up for weeks: at capacity
    the oldest hash is evicted, so the worst case is that a repost separated by
    more than `capacity` other messages gets through once. That is the right
    failure — it costs one draft an admin rejects, whereas an unbounded cache
    eventually costs the container.
    """

    __slots__ = ("_seen", "_capacity")

    def __init__(self, capacity: int = 256) -> None:
        # dicts preserve insertion order, which is all the LRU this needs.
        self._seen: dict[int, None] = {}
        self._capacity = max(1, capacity)

    def is_repeat(self, text: str) -> bool:
        """True if this exact text (whitespace-insensitive) was seen recently."""
        key = hash(" ".join(text.split()))
        if key in self._seen:
            # Refresh recency so a persistently re-posted advert stays blocked.
            self._seen.pop(key, None)
            self._seen[key] = None
            return True

        self._seen[key] = None
        while len(self._seen) > self._capacity:
            self._seen.pop(next(iter(self._seen)))
        return False
