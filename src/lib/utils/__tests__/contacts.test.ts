import { describe, expect, it } from "vitest";

import {
  instagramHandle,
  instagramLink,
  isValidInstagram,
  isValidPhone,
  normalizeInstagram,
  whatsappLink
} from "@/lib/utils/contacts";

describe("whatsappLink", () => {
  it("strips everything wa.me will not accept", () => {
    // wa.me takes digits only: no plus, no spaces, no dashes.
    expect(whatsappLink("+7 700 123-45-67")).toBe("https://wa.me/77001234567");
  });

  it("shares phone validation, because a WhatsApp contact is a phone number", () => {
    expect(isValidPhone("+7 700 123 45 67")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
  });
});

describe("instagram helpers", () => {
  it("accepts the three ways a handle gets pasted", () => {
    for (const input of ["almaty.rent", "@almaty.rent", "https://instagram.com/almaty.rent/"]) {
      expect(normalizeInstagram(input)).toBe("almaty.rent");
    }
  });

  it("drops tracking query strings from a copied profile URL", () => {
    expect(normalizeInstagram("https://www.instagram.com/almaty.rent?igsh=abc123")).toBe("almaty.rent");
  });

  it("rejects a handle that cannot be one", () => {
    expect(isValidInstagram("has spaces")).toBe(false);
    expect(isValidInstagram("way_too_long_a_handle_to_be_real_on_instagram")).toBe(false);
    expect(isValidInstagram("")).toBe(false);
  });

  it("renders a handle and a link", () => {
    expect(instagramHandle("@roomi.kz")).toBe("@roomi.kz");
    expect(instagramLink("@roomi.kz")).toBe("https://instagram.com/roomi.kz");
  });
});
