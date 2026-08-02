import { describe, expect, it } from "vitest";

import { parseRichText, richTextLength } from "../rich-text";

describe("parseRichText", () => {
  it("returns nothing for empty input", () => {
    expect(parseRichText("")).toEqual([]);
    expect(parseRichText(null)).toEqual([]);
    expect(parseRichText(undefined)).toEqual([]);
  });

  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    // Pasted posts hard-wrap mid-sentence; those are one paragraph, not two.
    expect(parseRichText("First line\ncontinues here.\n\nSecond paragraph.")).toEqual([
      { type: "paragraph", text: "First line continues here." },
      { type: "paragraph", text: "Second paragraph." }
    ]);
  });

  it("groups consecutive dash/asterisk/bullet lines into one list", () => {
    expect(parseRichText("- WiFi\n* Parking\n• Balcony")).toEqual([
      { type: "bullets", items: ["WiFi", "Parking", "Balcony"] }
    ]);
  });

  it("recognises numbered lists with . and ) markers", () => {
    expect(parseRichText("1. First\n2) Second")).toEqual([
      { type: "numbers", items: ["First", "Second"] }
    ]);
  });

  it("keeps emoji-led lines as list items WITH their emoji", () => {
    // ✅ / ❌ / 📍 carry meaning — stripping them would lose information.
    expect(parseRichText("✅ Deposit 50%\n✅ Girls only")).toEqual([
      { type: "bullets", items: ["✅ Deposit 50%", "✅ Girls only"] }
    ]);
  });

  it("handles a realistic imported Telegram post end to end", () => {
    const post = [
      "Сдаётся комната рядом с КБТУ 🏠",
      "",
      "- WiFi 100 мбит",
      "- Стиральная машина",
      "",
      "✅ Депозит 50%",
      "",
      "1. Заезд с 1 сентября"
    ].join("\n");

    expect(parseRichText(post)).toEqual([
      { type: "paragraph", text: "Сдаётся комната рядом с КБТУ 🏠" },
      { type: "bullets", items: ["WiFi 100 мбит", "Стиральная машина"] },
      { type: "bullets", items: ["✅ Депозит 50%"] },
      { type: "numbers", items: ["Заезд с 1 сентября"] }
    ]);
  });

  it("switches block type without a blank line between them", () => {
    expect(parseRichText("Intro text\n- one\n- two\nOutro text")).toEqual([
      { type: "paragraph", text: "Intro text" },
      { type: "bullets", items: ["one", "two"] },
      { type: "paragraph", text: "Outro text" }
    ]);
  });

  it("collapses runs of blank lines instead of emitting empty blocks", () => {
    expect(parseRichText("A\n\n\n\n\nB")).toEqual([
      { type: "paragraph", text: "A" },
      { type: "paragraph", text: "B" }
    ]);
  });

  it("normalises CRLF", () => {
    expect(parseRichText("A\r\n\r\nB")).toEqual([
      { type: "paragraph", text: "A" },
      { type: "paragraph", text: "B" }
    ]);
  });

  it("does NOT treat markdown emphasis or hashes as structure", () => {
    // The input is not Markdown. `*` mid-line and `#` before a number are
    // ordinary characters in these posts.
    expect(parseRichText("Price is 100*000 tenge #1 choice")).toEqual([
      { type: "paragraph", text: "Price is 100*000 tenge #1 choice" }
    ]);
  });

  it("does not mistake a decimal or a phone number for a numbered item", () => {
    expect(parseRichText("+7 707 123 45 67")).toEqual([
      { type: "paragraph", text: "+7 707 123 45 67" }
    ]);
  });

  it("requires whitespace after a marker so hyphenated words stay text", () => {
    expect(parseRichText("well-lit room")).toEqual([
      { type: "paragraph", text: "well-lit room" }
    ]);
  });
});

describe("richTextLength", () => {
  it("counts characters across every block type", () => {
    const blocks = parseRichText("abc\n\n- de\n- f");
    expect(richTextLength(blocks)).toBe("abc".length + "de".length + "f".length);
  });

  it("is zero for no blocks", () => {
    expect(richTextLength([])).toBe(0);
  });
});
