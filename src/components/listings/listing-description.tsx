import { parseRichText, richTextLength, type RichTextBlock } from "@/lib/utils/rich-text";

/**
 * "About this place" — the listing description.
 *
 * Carries no `"use client"` of its own, but it is rendered from
 * `listing-detail-client.tsx`, which does — so in practice this ships to the
 * browser with the rest of that tree. It becomes a true server component only
 * once the page's i18n stops depending on client React state; the boundary is
 * written to make that a one-line change rather than a rewrite (labels arrive
 * as props, and nothing here touches a hook).
 *
 * What it does avoid regardless of where it renders is JAVASCRIPT. Expand and
 * collapse are `<details>`/`<summary>`: native, keyboard-accessible, announced
 * correctly by screen readers, functional before hydration, and free of state,
 * handlers and re-renders. A `useState` toggle would have cost all four.
 *
 * Structure comes from `parseRichText`, so a pasted Telegram/OLX post renders
 * as real paragraphs and lists rather than one undifferentiated wall of text.
 */

/** Beyond this many characters the tail is collapsed behind "Show more". */
const COLLAPSE_THRESHOLD = 520;
/** Blocks always visible when collapsing kicks in. */
const VISIBLE_BLOCKS = 2;

function Blocks({ blocks }: { blocks: RichTextBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={index} className="break-words text-[15px] leading-7 text-foreground/80 sm:text-base sm:leading-[1.75]">
              {block.text}
            </p>
          );
        }

        if (block.type === "numbers") {
          return (
            <ol key={index} className="list-decimal space-y-1.5 pl-5 marker:text-foreground/40">
              {block.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="break-words pl-1 text-[15px] leading-7 text-foreground/80 sm:text-base sm:leading-[1.75]"
                >
                  {item}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <ul key={index} className="space-y-1.5">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="flex gap-2.5 break-words text-[15px] leading-7 text-foreground/80 sm:text-base sm:leading-[1.75]"
              >
                {/* Author-supplied emoji markers are part of the text and must
                    not get a second bullet in front of them. */}
                {/^\p{Extended_Pictographic}/u.test(item) ? null : (
                  <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/45" />
                )}
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        );
      })}
    </>
  );
}

export function ListingDescription({
  description,
  showMoreLabel,
  showLessLabel
}: {
  description: string;
  /** Localised by the caller — this component takes no locale dependency. */
  showMoreLabel: string;
  showLessLabel: string;
}) {
  const blocks = parseRichText(description);
  if (!blocks.length) return null;

  const needsCollapse = richTextLength(blocks) > COLLAPSE_THRESHOLD && blocks.length > VISIBLE_BLOCKS;
  const head = needsCollapse ? blocks.slice(0, VISIBLE_BLOCKS) : blocks;
  const tail = needsCollapse ? blocks.slice(VISIBLE_BLOCKS) : [];

  return (
    // max-w-prose caps the measure at a readable line length on wide screens;
    // an unbounded column is what makes long descriptions tiring to read.
    <div className="max-w-prose space-y-3.5">
      <Blocks blocks={head} />

      {needsCollapse ? (
        <details className="group/desc">
          <div className="hidden space-y-3.5 group-open/desc:block">
            <Blocks blocks={tail} />
          </div>
          <summary className="mt-1 inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-[15px] font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="group-open/desc:hidden">{showMoreLabel}</span>
            <span className="hidden group-open/desc:inline">{showLessLabel}</span>
          </summary>
        </details>
      ) : null}
    </div>
  );
}
