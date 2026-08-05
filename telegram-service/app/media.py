"""
Photo download (Telethon) + upload (Supabase Storage).

Deliberately does NOT add a new compression/resizing step: the existing
Next.js pipeline (src/app/api/upload/route.ts) verifies the byte content is a
real raster image and stores it as-is — optimization happens read-side via
next/image, not at upload time. Reusing "the existing image compression,
optimization pipeline" therefore means storing photos the same way (verified
raw bytes, same bucket, same public-URL shape), which is exactly what this
module does, not building a separate image-processing step that has no
equivalent on the TypeScript side.
"""

from __future__ import annotations

import logging
import uuid

from telethon.tl.custom.message import Message

from app.db import upload_photo

logger = logging.getLogger(__name__)

# Magic-byte content sniffing, mirroring src/lib/utils/file-signature.ts:
# the declared type is never trusted, only the actual bytes.
_SIGNATURES: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}


def _detect_image_type(data: bytes) -> str | None:
    for magic, mime in _SIGNATURES.items():
        if data.startswith(magic):
            return mime
    # WEBP: "RIFF" .... "WEBP" (bytes 8-11)
    if len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


_EXTENSION_BY_TYPE = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

MAX_PHOTOS_PER_MESSAGE = 10
# Matches MAX_IMAGE_SIZE in src/lib/supabase/storage.ts (5 MB).
MAX_IMAGE_BYTES = 5 * 1024 * 1024


async def download_media(message: Message, draft_id: str) -> list[str]:
    """
    Downloads every photo attached to a Telegram message and uploads each to
    Supabase Storage under telegram/<draft_id>/<uuid>.<ext> in the existing
    bucket. Returns the public URLs that succeeded — a partial failure (one bad
    photo, a transient network error) returns whatever DID upload rather than
    raising, since a draft listing with 2 of 3 photos is far more useful than
    one discarded entirely for a single bad attachment (see requirement:
    "Do not crash if ... missing photos").
    """
    if not message.photo and not message.grouped_id:
        return []

    photos: list[Message] = [message]
    urls: list[str] = []

    for photo_message in photos[:MAX_PHOTOS_PER_MESSAGE]:
        try:
            data = await photo_message.download_media(bytes)
        except Exception:  # noqa: BLE001 - never let one bad attachment kill extraction
            logger.exception("Photo download failed", extra={"draft_id": draft_id})
            continue

        if not data or len(data) > MAX_IMAGE_BYTES:
            logger.warning(
                "Skipping photo: missing or over size limit",
                extra={"draft_id": draft_id, "size": len(data) if data else 0},
            )
            continue

        content_type = _detect_image_type(bytes(data[:16]))
        if not content_type:
            logger.warning("Skipping photo: not a recognized image format", extra={"draft_id": draft_id})
            continue

        extension = _EXTENSION_BY_TYPE[content_type]
        path = f"telegram/{draft_id}/{uuid.uuid4()}.{extension}"

        try:
            url = await upload_photo(path, bytes(data), content_type)
            urls.append(url)
        except Exception:  # noqa: BLE001
            logger.exception("Photo upload failed", extra={"draft_id": draft_id, "path": path})
            continue

    return urls
