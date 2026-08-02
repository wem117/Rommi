/**
 * Parses a plain-text listing description into renderable blocks.
 *
 * Descriptions here are pasted from Telegram, WhatsApp and OLX posts. They are
 * not prose — they are lists, and they arrive shaped by whatever the author
 * typed:
 *
 *     Сдаётся комната рядом с КБТУ 🏠
 *
 *     - WiFi 100 мбит
 *     - Стиральная машина
 *     • Без животных
 *
 *     ✅ Депозит 50%
 *     ✅ Только девушки
 *
 *     1. Заезд с 1 сентября
 *
 * Rendering that into a single `whitespace-pre-line` paragraph — which is what
 * the listing page did — produces an undifferentiated wall of text where the
 * structure the author bothered to add is thrown away, and long posts become
 * unreadable exactly where the useful detail lives.
 *
 * Returns semantic blocks so the renderer can emit real `<p>`, `<ul>` and
 * `<ol>` elements: better readability, and screen readers announce list
 * structure and item counts instead of one long run of text.
 *
 * Deliberately NOT a Markdown parser. The input is not Markdown, and treating
 * it as such would mangle ordinary text — `*` around a word, `#` before a
 * number, or an underscore in a URL are all common in these posts and none of
 * them mean emphasis. This only recognises line-leading list markers, which is
 * the one structure these posts actually use.
 */

export type RichTextBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbers"; items: string[] };

/** `-`, `*`, `•`, `–`, `—`, `·` followed by whitespace. */
const BULLET_MARKER = /^\s*[-*•–—·]\s+/;
/** `1.` / `1)` / `1 -` followed by whitespace. */
const NUMBER_MARKER = /^\s*\d{1,2}[.)]\s+/;

/**
 * A line that opens with an emoji, e.g. "✅ Депозит 50%".
 *
 * Very common as a bullet in these posts. The emoji is KEPT — it is the
 * author's chosen marker and carries meaning (✅ included, ❌ excluded, 📍
 * location), so replacing it with a generic bullet would lose information.
 */
const EMOJI_LEAD = /^\s*(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})[️‍\p{Extended_Pictographic}]*\s+/u;

function isBullet(line: string) {
  return BULLET_MARKER.test(line);
}

function isNumbered(line: string) {
  return NUMBER_MARKER.test(line);
}

function isEmojiItem(line: string) {
  try {
    return EMOJI_LEAD.test(line);
  } catch {
    // Unicode property escapes are ES2018; if unsupported, degrade to plain
    // paragraphs rather than throwing during render.
    return false;
  }
}

export function parseRichText(input: string | null | undefined): RichTextBlock[] {
  if (!input) return [];

  // Normalise newlines, then collapse runs of 3+ blank lines. Pasted posts are
  // full of accidental double-spacing that would otherwise render as gaps.
  const lines = input
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n");

  const blocks: RichTextBlock[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length) blocks.push({ type: "bullets", items: bullets });
    bullets = [];
  };
  const flushNumbers = () => {
    if (numbers.length) blocks.push({ type: "numbers", items: numbers });
    numbers = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushBullets();
    flushNumbers();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    if (isNumbered(line)) {
      flushParagraph();
      flushBullets();
      numbers.push(line.replace(NUMBER_MARKER, "").trim());
      continue;
    }

    if (isBullet(line)) {
      flushParagraph();
      flushNumbers();
      bullets.push(line.replace(BULLET_MARKER, "").trim());
      continue;
    }

    if (isEmojiItem(line)) {
      flushParagraph();
      flushNumbers();
      // Marker preserved — see EMOJI_LEAD.
      bullets.push(line.trim());
      continue;
    }

    flushBullets();
    flushNumbers();
    paragraph.push(line.trim());
  }

  flushAll();
  return blocks;
}

/** Plain-text length, for deciding whether a description needs a "show more". */
export function richTextLength(blocks: RichTextBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.type === "paragraph") return total + block.text.length;
    return total + block.items.reduce((sum, item) => sum + item.length, 0);
  }, 0);
}
