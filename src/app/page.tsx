import { getHomepageData } from "@/lib/data/homepage-server";
import { FAQ_IDS } from "@/lib/content/faq";
import { translate } from "@/lib/i18n";

import HomeClient from "./home-client";

// Server-rendered homepage with ISR: featured listings/roommates/universities,
// testimonials, and platform settings are fetched on the server in one round
// trip and streamed as real HTML (SEO + fast first paint). The client island
// handles search, locale, animations, and the mobile menu.
export const revalidate = 120;

/**
 * FAQPage markup for the questions rendered by <FaqSection />.
 *
 * Built from FAQ_IDS and the same translation strings the component reads, so
 * the structured data cannot describe a question the page does not show.
 *
 * Emitted in `ru` deliberately: LocaleProvider starts at "ru" and only switches
 * after hydration reads localStorage, so Russian is what the server renders and
 * therefore what a crawler sees. Marking up any other language would claim
 * answers that are not in the fetched HTML.
 */
function faqStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_IDS.map((id) => ({
      "@type": "Question",
      name: translate("ru", `home.faq_${id}_q`),
      acceptedAnswer: {
        "@type": "Answer",
        text: translate("ru", `home.faq_${id}_a`)
      }
    }))
  };
}

export default async function Page() {
  const initialData = await getHomepageData();

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so a translated string can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData()).replace(/</g, "\\u003c") }}
      />
      <HomeClient initialData={initialData} />
    </>
  );
}
