"""
Whether a draft may go live without a human reading it first.

This is the most consequential decision in the service, and the only one that
can put a stranger's phone number on a public page unattended. So it is written
as a list of conditions that must ALL hold, each one returning its own reason
when it fails — never as a score compared against a threshold on its own.

The failure mode being designed against is a partial publish: a listing that
goes live missing its photos, or missing the contact that makes it useful, or
attached to a post that was actually somebody asking for a room. Every condition
below is checked before anything is written, and the answer is one of exactly
two outcomes — publish, or pending review. There is no third state.

Pure: no I/O, no clock, no database. The caller supplies what it observed and
gets back a decision it can log verbatim.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from telegram_parser.parser import DRAFT_LISTING, ParsedListing

# Below this, a human looks at it. 75 of a possible 100 means the parser
# established intent, a contact, a price and a real location — which is
# materially everything a reviewer checks — and still leaves room to miss the
# corroborating detail fields.
DEFAULT_MIN_CONFIDENCE = 75

# A description this short is a caption, not a listing. The figure is not
# arbitrary: "Сдаются новые квартиры в пяти минутах от СДУ! Могут жить до 5
# человек, цена:180 тысяч" — a real post, and about the thinnest one anybody
# would defend publishing unread — is 108 characters.
MIN_DESCRIPTION_LENGTH = 100
MIN_TITLE_LENGTH = 10


@dataclass(frozen=True, slots=True)
class PublishDecision:
    """Publish or hold, and every reason why not."""

    publish: bool
    blockers: tuple[str, ...] = ()
    confidence: int = 0

    @property
    def status(self) -> str:
        """The `telegram_listings.status` this decision writes."""
        return "published" if self.publish else "pending_review"

    def as_log_extra(self) -> dict[str, object]:
        return {
            "auto_publish": self.publish,
            "confidence": self.confidence,
            "blockers": "; ".join(self.blockers[:6]),
        }


@dataclass(frozen=True, slots=True)
class MediaOutcome:
    """What happened to the post's images, as the caller observed it."""

    attached: int = 0
    uploaded: int = 0

    @property
    def complete(self) -> bool:
        """
        Every attached image made it to storage.

        Strict on purpose: a listing whose photos half-uploaded is exactly the
        "partially published" outcome this module exists to prevent. A draft
        with 5 of 6 photos is fine for a human to approve — they can see what
        they are approving — but it must not go live unread.
        """
        return self.uploaded >= self.attached


@dataclass(frozen=True, slots=True)
class PublishPolicy:
    """
    Operator-controlled limits.

    `enabled` defaults to FALSE. Automatic publishing is the kind of behaviour
    that should be switched on deliberately, by someone who has watched the
    queue for a while, rather than arriving with a deploy.
    """

    enabled: bool = False
    min_confidence: int = DEFAULT_MIN_CONFIDENCE
    # No longer read by decide() — zero photos is now an unconditional blocker
    # (see the comment above the "no images" check), which is everything this
    # flag ever did. Kept as a field because it is a real column in
    # site_settings and a real checkbox in Admin -> Telegram; removing either
    # is a separate change from this one.
    require_photos: bool = False
    extra: dict = field(default_factory=dict)


def decide(
    listing: ParsedListing,
    *,
    policy: PublishPolicy,
    media: MediaOutcome = MediaOutcome(),
    spam_score: int = 0,
    min_spam_score: int = 2,
) -> PublishDecision:
    """
    Every condition, collected — not short-circuited.

    Returning ALL the blockers rather than the first one is what makes the log
    line useful: "held for review: no contact; confidence 55 < 75" tells an
    operator what to fix about the parser, where "held for review: no contact"
    sends them round the loop again tomorrow.
    """
    blockers: list[str] = []

    if not policy.enabled:
        blockers.append("automatic publishing is disabled")

    # 1. A property listing, and nothing else. A roommate search becomes a
    #    profile, and an unclassifiable post becomes a question for a human.
    if listing.draft_kind != DRAFT_LISTING:
        blockers.append(f"not a property listing (draft kind: {listing.draft_kind})")

    # 2. Not spam. The gate upstream already dropped the obvious cases without
    #    writing anything down; this is the same threshold applied again, so a
    #    post that only just scraped past it is not also published unread.
    if spam_score < min_spam_score:
        blockers.append(f"weak housing signal (spam score {spam_score} < {min_spam_score})")

    # 3. Confidence.
    if listing.confidence < policy.min_confidence:
        blockers.append(f"confidence {listing.confidence} < {policy.min_confidence}")

    # 4. The fields a moderator would refuse to publish without.
    if len(listing.title.strip()) < MIN_TITLE_LENGTH:
        blockers.append("no usable title")
    if len(listing.description.strip()) < MIN_DESCRIPTION_LENGTH:
        blockers.append(f"description under {MIN_DESCRIPTION_LENGTH} characters")
    if not listing.city.strip():
        blockers.append("no city")
    if not listing.property_type:
        blockers.append("no property type")

    # 5. At least one way to reach the poster. A listing nobody can respond to
    #    is not inventory, it is noise — and publishing it unread is worse than
    #    holding it, because the reader cannot tell that until they try.
    if not listing.has_contact:
        blockers.append("no contact method")

    # 6. Images: all of them, or none attached at all.
    if not media.complete:
        blockers.append(f"only {media.uploaded} of {media.attached} images uploaded")

    # 7. A photo, and a price. Unconditional — NOT behind policy.require_photos
    #    — for the same reason #5 is unconditional: this is a completeness
    #    floor, not an operator preference. The web listing form enforces the
    #    identical two rules on a human filling in the same fields (a listing
    #    cannot be submitted with zero photos or an empty price), so the
    #    unattended import path must not be able to publish what a person could
    #    not.
    #
    #    `policy.require_photos` is now a NO-OP inside this function: reading
    #    the old logic closely, it only ever fired on exactly the case this
    #    check covers (attached == 0 implies uploaded == 0, and any other
    #    partial-upload shape already failed `media.complete` above regardless
    #    of the flag). The dataclass field is left in place rather than
    #    removed — it is a real column in site_settings and a real toggle in
    #    Admin -> Telegram, and deleting an admin-facing setting is a bigger,
    #    separate change from this one — but it no longer does anything, since
    #    what it gated is now always on.
    #
    #    A human admin reviewing the pending queue can still approve a genuine
    #    no-price post — Telegram posts legitimately omit one sometimes, and
    #    "Price not specified" is truthful for those. What this closes off is
    #    auto-publishing one WITHOUT anyone reading it.
    if media.attached == 0:
        blockers.append("no images")
    if not listing.price or listing.price <= 0:
        blockers.append("no price")

    return PublishDecision(
        publish=not blockers,
        blockers=tuple(blockers),
        confidence=listing.confidence,
    )
