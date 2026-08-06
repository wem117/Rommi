"""
Photo download (Telethon) -> upload (Supabase Storage), without ever holding a
whole image in memory.

Three things this module gets right that the previous version did not:

 1. ALBUMS. Telegram delivers a multi-photo post as N separate messages sharing
    a `grouped_id`, with the caption on exactly one of them. The old code took
    `[message]` — the single message it was handed — so an album of six photos
    produced a draft with one, and the five caption-less siblings were recorded
    as textless messages that failed with "message has no text". 26 of the 44
    messages in production were exactly that. This module accepts the whole
    group.

 2. SIZE IS CHECKED BEFORE THE DOWNLOAD, not after. Telegram tells us
    `message.file.size` up front; the old code downloaded a 40 MB file into RAM
    and only then decided it was too big.

 3. STREAMING. Bytes go Telegram -> spooled temp file -> Supabase, a chunk at a
    time. Peak memory is one chunk, not one image — which is what lets this run
    in a 384 MB container next to everything else on the box.

No compression or resizing step, deliberately: the existing Next.js pipeline
(src/app/api/upload/route.ts) verifies the byte content is a real raster image
and stores it as-is, with optimization happening read-side via next/image.
Reusing "the existing image pipeline" means storing photos the same way, not
building a second one that only Telegram imports go through.
"""

from __future__ import annotations

import logging
import tempfile
import uuid
from typing import Any, Iterable

from app.db import upload_photo_stream

logger = logging.getLogger(__name__)

# Magic-byte content sniffing, mirroring src/lib/utils/file-signature.ts: the
# declared type is never trusted, only the actual bytes.
_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
)

_EXTENSION_BY_TYPE = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

MAX_PHOTOS_PER_MESSAGE = 10
# Matches MAX_IMAGE_SIZE in src/lib/supabase/storage.ts (5 MB).
MAX_IMAGE_BYTES = 5 * 1024 * 1024
# Below this a photo stays in RAM; above it the spooled file rolls over to disk.
# Most Telegram photos land under it, so the common case costs no I/O and the
# uncommon one costs no memory.
SPOOL_THRESHOLD_BYTES = 512 * 1024


def _detect_image_type(header: bytes) -> str | None:
    for magic, mime in _SIGNATURES:
        if header.startswith(magic):
            return mime
    # WEBP: "RIFF" .... "WEBP" (bytes 8-11)
    if len(header) >= 12 and header[0:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    return None


def _photo_size(message: Any) -> int | None:
    """Telegram's declared size, before a single byte is transferred."""
    file_info = getattr(message, "file", None)
    size = getattr(file_info, "size", None)
    return size if isinstance(size, int) else None


async def download_media(messages: Any, draft_id: str) -> list[str]:
    """
    Uploads every photo on `messages` to Storage under
    telegram/<draft_id>/<uuid>.<ext>, returning the public URLs that succeeded.

    Accepts a single message or an iterable of them (an album). A partial
    failure — one corrupt attachment, one storage blip — returns whatever DID
    upload rather than raising: a draft with 5 of 6 photos is worth far more to
    the reviewing admin than no draft at all.
    """
    group: Iterable[Any]
    if messages is None:
        return []
    group = messages if isinstance(messages, (list, tuple)) else [messages]

    urls: list[str] = []
    for message in list(group)[:MAX_PHOTOS_PER_MESSAGE]:
        if message is None or not getattr(message, "photo", None):
            continue

        declared = _photo_size(message)
        if declared is not None and declared > MAX_IMAGE_BYTES:
            logger.warning(
                "Skipping photo: over size limit before download",
                extra={"draft_id": draft_id, "size": declared, "limit": MAX_IMAGE_BYTES},
            )
            continue

        url = await _transfer_one(message, draft_id)
        if url:
            urls.append(url)

    return urls


async def _transfer_one(message: Any, draft_id: str) -> str | None:
    """
    One photo, Telegram -> temp file -> Storage. Never raises.

    The temp file is the whole trick: Telethon writes into it chunk by chunk,
    httpx reads out of it chunk by chunk, and neither end ever needs the image
    as one object. SpooledTemporaryFile keeps the small majority in memory
    anyway, so the usual case pays no disk I/O for the privilege.
    """
    spooled = tempfile.SpooledTemporaryFile(max_size=SPOOL_THRESHOLD_BYTES, mode="w+b")
    try:
        try:
            await message.download_media(file=spooled)
        except Exception:  # noqa: BLE001 - one bad attachment must not stop the rest
            logger.exception("Photo download failed", extra={"draft_id": draft_id})
            return None

        size = spooled.tell()
        if not size:
            logger.warning("Skipping photo: downloaded zero bytes", extra={"draft_id": draft_id})
            return None
        if size > MAX_IMAGE_BYTES:
            # Reached when Telegram declared no size up front.
            logger.warning(
                "Skipping photo: over size limit", extra={"draft_id": draft_id, "size": size}
            )
            return None

        spooled.seek(0)
        content_type = _detect_image_type(spooled.read(16))
        if not content_type:
            logger.warning(
                "Skipping photo: not a recognized image format", extra={"draft_id": draft_id}
            )
            return None

        spooled.seek(0)
        path = f"telegram/{draft_id}/{uuid.uuid4()}.{_EXTENSION_BY_TYPE[content_type]}"
        try:
            return await upload_photo_stream(path, spooled, size, content_type)
        except Exception:  # noqa: BLE001
            logger.exception("Photo upload failed", extra={"draft_id": draft_id, "path": path})
            return None
    finally:
        spooled.close()
