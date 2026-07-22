/**
 * Content-based image verification (magic bytes).
 *
 * The upload route must never trust the client-declared `Content-Type` or file
 * extension: an attacker can rename a `.html`/`.svg` payload to `.png` and set a
 * spoofed MIME to smuggle it into the PUBLIC storage bucket, where it would be
 * served from a *.supabase.co origin (stored-XSS / malware-hosting risk).
 *
 * This inspects the actual leading bytes and confirms they match one of the
 * allowed raster formats. SVG is intentionally unsupported (it is XML and can
 * carry script). Returns the detected MIME type or null if unrecognized.
 */

export type DetectedImageType = "image/jpeg" | "image/png" | "image/webp";

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

/** Detect a supported raster image from its magic bytes, or null. */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";

  // WEBP: "RIFF" .... "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }

  return null;
}

/**
 * Verify a File's real content against the allowed image formats. Reads only the
 * first 16 bytes — enough for every signature above — so it is cheap even for
 * large uploads.
 */
export async function verifyImageContent(file: File): Promise<DetectedImageType | null> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return detectImageType(header);
}
