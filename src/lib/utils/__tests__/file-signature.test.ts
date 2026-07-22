import { describe, expect, it } from "vitest";

import { detectImageType } from "@/lib/utils/file-signature";

describe("detectImageType", () => {
  it("detects JPEG magic bytes", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe("image/jpeg");
  });

  it("detects PNG magic bytes", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
  });

  it("detects WEBP (RIFF....WEBP)", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
    ]);
    expect(detectImageType(bytes)).toBe("image/webp");
  });

  it("rejects SVG / HTML / spoofed content", () => {
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>");
    const html = new TextEncoder().encode("<!DOCTYPE html><script>alert(1)</script>");
    expect(detectImageType(svg)).toBeNull();
    expect(detectImageType(html)).toBeNull();
    expect(detectImageType(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });
});
