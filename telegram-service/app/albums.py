"""
Reassembles Telegram albums into the single post a human sees.

Telegram has no "message with six photos". An album arrives as six separate
NewMessage events sharing a `grouped_id`, delivered within a few hundred
milliseconds of each other, with the caption attached to exactly ONE of them
(usually, but not reliably, the first).

Handling those events individually — which is what this service used to do —
goes wrong twice over: the post's photos are split across six drafts, and five
of the six have no text, so five of every six album messages were recorded and
then failed with "message has no text". That was 26 of the 44 messages in
production, and not one of them produced anything an admin could review.

So: hold a group for `wait_seconds`, then hand the whole thing over at once. The
delay is the cost of correctness here — there is no completion signal in the
protocol to wait for instead.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable

logger = logging.getLogger(__name__)

# Guard against a pathological stream holding unbounded message objects. Well
# above any real album (Telegram caps them at 10) times a healthy number of
# simultaneously-arriving posts.
MAX_PENDING_GROUPS = 32
MAX_MESSAGES_PER_GROUP = 10


class AlbumBuffer:
    """
    Groups album messages by `grouped_id` and flushes each group once.

    One asyncio timer per open group; there is never more than
    MAX_PENDING_GROUPS of them, and each is cancelled the moment its group
    flushes. Nothing here survives a restart, which is correct — Telethon only
    delivers live events, so a group interrupted by a restart was never going to
    be completed anyway.
    """

    __slots__ = ("_wait", "_flush", "_groups", "_timers")

    def __init__(
        self,
        wait_seconds: float,
        flush: Callable[[list[Any], str], Awaitable[None]],
    ) -> None:
        self._wait = wait_seconds
        self._flush = flush
        self._groups: dict[int, tuple[str, list[Any]]] = {}
        self._timers: dict[int, asyncio.Task[None]] = {}

    async def add(self, grouped_id: int, message: Any, source_id: str) -> None:
        """Adds one album member, starting the group's timer if it is the first."""
        source, members = self._groups.get(grouped_id, (source_id, []))
        if len(members) < MAX_MESSAGES_PER_GROUP:
            members.append(message)
        self._groups[grouped_id] = (source, members)

        if grouped_id not in self._timers:
            if len(self._groups) > MAX_PENDING_GROUPS:
                # Something is very wrong upstream; flush the oldest rather than
                # accumulate. dicts iterate in insertion order, so this is the
                # group that has been waiting longest.
                oldest = next(iter(self._groups))
                logger.warning(
                    "Album buffer full; flushing the oldest group early",
                    extra={"pending_groups": len(self._groups), "flushed": oldest},
                )
                await self._release(oldest)
            self._timers[grouped_id] = asyncio.create_task(self._wait_then_release(grouped_id))

    async def _wait_then_release(self, grouped_id: int) -> None:
        try:
            await asyncio.sleep(self._wait)
        except asyncio.CancelledError:
            raise
        await self._release(grouped_id)

    async def _release(self, grouped_id: int) -> None:
        entry = self._groups.pop(grouped_id, None)
        timer = self._timers.pop(grouped_id, None)
        if timer is not None and timer is not asyncio.current_task():
            timer.cancel()
        if entry is None:
            return

        source_id, members = entry
        # Telegram numbers album members sequentially; ordering by id keeps the
        # photos in the order the poster arranged them.
        members.sort(key=lambda m: getattr(m, "id", 0))
        try:
            await self._flush(members, source_id)
        except Exception:  # noqa: BLE001 - a bad album must not kill the listener
            logger.exception("Album flush failed", extra={"grouped_id": grouped_id})

    async def close(self) -> None:
        """Cancels every open timer and drops the buffered messages."""
        for timer in list(self._timers.values()):
            timer.cancel()
        self._timers.clear()
        self._groups.clear()

    @property
    def pending_groups(self) -> int:
        return len(self._groups)
