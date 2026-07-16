import type { ReactNode } from "react";

export type LegalSection = {
  heading: string;
  body?: ReactNode;
  paragraphs?: string[];
  list?: string[];
};

/**
 * Shared presentation for static legal / informational pages (Safety, Terms,
 * Privacy) so they stay visually consistent and easy to maintain.
 */
export function LegalPage({
  title,
  updated,
  updatedLabel = "Last updated",
  intro,
  sections
}: {
  title: string;
  updated: string;
  updatedLabel?: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Roomi</p>
      <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-foreground/50">
        {updatedLabel}: {updated}
      </p>
      <p className="mt-6 text-base leading-7 text-foreground/70">{intro}</p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-heading text-xl font-bold text-foreground">{section.heading}</h2>
            {section.paragraphs?.map((paragraph, index) => (
              <p key={index} className="mt-3 text-sm leading-7 text-foreground/70">
                {paragraph}
              </p>
            ))}
            {section.list ? (
              <ul className="mt-3 space-y-2">
                {section.list.map((item, index) => (
                  <li key={index} className="flex gap-2 text-sm leading-7 text-foreground/70">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {section.body ? <div className="mt-3 text-sm leading-7 text-foreground/70">{section.body}</div> : null}
          </section>
        ))}
      </div>
    </article>
  );
}
