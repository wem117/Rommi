"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { SectionHeader } from "@/components/home/section-header";
import { useLocale } from "@/context/locale-context";
import { FAQ_IDS } from "@/lib/content/faq";

/**
 * Homepage FAQ.
 *
 * A disclosure list rather than <details>/<summary>: the panel animates via
 * grid-template-rows, which <details> cannot do without scripting its own
 * height, and exclusive open state ("one at a time") would otherwise depend on
 * the `name` attribute, which is still too new to rely on here.
 *
 * Accessibility: each question is a real <button> inside an <h3>, wired to its
 * panel with aria-expanded/aria-controls. The collapsed panel is `invisible`,
 * not merely zero-height, so its links and text leave the tab order and the
 * accessibility tree instead of being silently focusable behind a clipped box.
 *
 * Copy lives in lib/i18n.ts under `home.faq_<id>_q` / `_a` in all three
 * languages, so nothing here is English-only.
 */
export function FaqSection() {
  const { t } = useLocale();
  const [openId, setOpenId] = useState<string | null>(FAQ_IDS[0]);
  const uid = useId();

  return (
    <section
      id="faq"
      aria-labelledby={`${uid}-faq-heading`}
      className="bg-surface-muted/40 px-4 py-10 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          badge={t("home.faqBadge")}
          title={t("home.faqTitle")}
          description={t("home.faqDescription")}
          titleId={`${uid}-faq-heading`}
          centered
        />

        <div className="mt-8 space-y-3 sm:mt-10">
          {FAQ_IDS.map((id) => {
            const open = openId === id;
            const buttonId = `${uid}-${id}-button`;
            const panelId = `${uid}-${id}-panel`;

            return (
              <div
                key={id}
                className="overflow-hidden rounded-card border border-border bg-card shadow-elev-2"
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenId(open ? null : id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none sm:px-6 sm:py-5 sm:text-base"
                  >
                    <span>{t(`home.faq_${id}_q`)}</span>
                    <span
                      aria-hidden="true"
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted text-foreground/60 transition-transform duration-ui ease-ui motion-reduce:transition-none ${
                        open ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                </h3>

                {/*
                  0fr -> 1fr animates to the content's natural height without
                  measuring it in JS, so a long answer never gets clipped the
                  way a fixed max-height would.
                */}
                <div
                  className={`grid transition-[grid-template-rows] duration-ui ease-ui motion-reduce:transition-none ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className={`overflow-hidden ${open ? "visible" : "invisible"}`}>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="px-4 pb-5 text-sm leading-7 text-foreground/70 sm:px-6 sm:pb-6"
                    >
                      {t(`home.faq_${id}_a`)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
