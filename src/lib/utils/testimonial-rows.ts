/**
 * How the testimonial marquee turns database records into two rows.
 *
 * Pure and separate from the component so it can be tested without a DOM, and
 * so the one piece of logic that could plausibly turn a list of people into the
 * same person repeated is inspectable on its own.
 *
 * Nothing here reads, writes or invents a testimonial's fields. It only decides
 * how many times the SEQUENCE appears and which row each record lands in.
 */

/**
 * Minimum cards in one copy of a row's track.
 *
 * The seamless loop works by translating exactly -50%, i.e. one copy's width.
 * That only LOOKS continuous if a copy is at least as wide as the viewport —
 * otherwise the track runs out and you watch a gap cross the screen before the
 * next copy arrives. A card is ~21rem (336px), so six covers a 2000px display.
 *
 * This is why the fix is repetition rather than a wider card: with two real
 * testimonials the row is 672px, and no amount of styling makes that fill a
 * desktop.
 */
const MIN_CARDS_PER_COPY = 6;

/**
 * Repeats the WHOLE list until a row is wide enough to loop without gaps.
 *
 * The distinction that matters: this repeats the list, never an item. Four
 * testimonials become A B C D A B C D — not A A B B C C D D, and certainly not
 * A A A A. Every card still renders its own record; repetition only decides how
 * many times the sequence appears.
 */
export function repeatToFill<T>(items: readonly T[]): T[] {
  if (items.length === 0) return [];
  const copies = Math.ceil(MIN_CARDS_PER_COPY / items.length);
  return Array.from({ length: copies }, () => items).flat();
}

/**
 * Row split, extracted so the mapping can be tested without a DOM.
 *
 * Returns the two rows as they will be rendered. Every entry is a real record;
 * nothing here invents, clones or cross-assigns a testimonial's fields.
 */
/**
 * Below this, a marquee is the wrong shape for the content.
 *
 * A gapless loop needs a viewport's worth of cards, so with one testimonial the
 * sequence has to repeat about six times per copy — twenty-four identical faces
 * on a conveyor belt. That is not "one testimonial shown in a marquee", it is a
 * wall of the same person, and it reads as broken data rather than as social
 * proof. Two is barely better.
 *
 * With fewer than three real testimonials the section renders them once, centred
 * and still, which is honest about how many there are. The marquee starts when
 * there is genuinely a stream to show.
 */
export const MIN_FOR_MARQUEE = 3;

export function buildRows<T>(items: readonly T[]): { top: T[]; bottom: T[] } {
  const canSplit = items.length >= 4;
  const half = Math.ceil(items.length / 2);
  const top = canSplit ? items.slice(0, half) : items;
  const bottomBase = canSplit ? items.slice(half) : items;
  return { top: repeatToFill(top), bottom: repeatToFill([...bottomBase].reverse()) };
}

