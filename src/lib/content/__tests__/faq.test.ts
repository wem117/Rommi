import { describe, expect, it } from "vitest";

import { FAQ_IDS } from "@/lib/content/faq";
import { localeOptions, translate, type Locale } from "@/lib/i18n";

const LOCALES = localeOptions.map((option) => option.value) as Locale[];

/**
 * The FAQ renders `t("home.faq_<id>_q")` for every id in FAQ_IDS. `translate`
 * falls back to English and then to the key itself, so a missing Russian or
 * Kazakh entry does not crash — it silently ships English, or the raw key, to
 * users of that language. These assertions are what make that loud.
 */
describe("homepage FAQ copy", () => {
  it("covers every question in every supported language", () => {
    for (const id of FAQ_IDS) {
      for (const locale of LOCALES) {
        for (const suffix of ["q", "a"] as const) {
          const key = `home.faq_${id}_${suffix}`;
          const value = translate(locale, key);
          expect(value, `${key} missing for ${locale}`).not.toBe(key);
          expect(value.trim(), `${key} empty for ${locale}`).not.toBe("");
        }
      }
    }
  });

  it("is genuinely translated, not English silently falling through", () => {
    for (const id of FAQ_IDS) {
      for (const suffix of ["q", "a"] as const) {
        const key = `home.faq_${id}_${suffix}`;
        const en = translate("en", key);
        expect(translate("ru", key), `${key} is untranslated in ru`).not.toBe(en);
        expect(translate("kz", key), `${key} is untranslated in kz`).not.toBe(en);
      }
    }
  });

  it("keeps the section heading and description translated too", () => {
    for (const key of ["home.faqTitle", "home.faqDescription", "home.faqBadge"]) {
      for (const locale of LOCALES) {
        expect(translate(locale, key)).not.toBe(key);
      }
    }
  });

  it("has no duplicate ids, so React keys and JSON-LD entries stay unique", () => {
    expect(new Set(FAQ_IDS).size).toBe(FAQ_IDS.length);
  });
});
