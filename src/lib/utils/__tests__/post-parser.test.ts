import { describe, expect, it } from "vitest";

import { applyExtraction, extractFromPost } from "@/lib/utils/post-parser";

// Reference date for the relative-date cases, so "1 сентября" is deterministic.
const TODAY = new Date(2026, 7, 2); // 2 August 2026

describe("extractFromPost — real posts", () => {
  it("reads a Telegram room post", () => {
    const post = `Сдаётся комната в 2-комнатной квартире, Алматы, Бостандыкский р-н.
Рядом КБТУ, 10 минут пешком. Для девушки, без животных.
150 000 тг в месяц, коммуналка включена.
Заселение с 1 сентября.
Звоните: +7 701 234 56 78, есть WhatsApp
Телеграм @aigerim_kz`;

    const out = extractFromPost(post, TODAY);
    expect(out.phone).toBe("+77012345678");
    expect(out.whatsapp).toBe("+77012345678");
    expect(out.telegram).toBe("aigerim_kz");
    expect(out.monthlyRent).toBe(150_000);
    expect(out.genderPreference).toBe("female");
    expect(out.availableFrom).toBe("2026-09-01");
  });

  it("reads a WhatsApp-style post with a different WhatsApp number", () => {
    const post = `Ищу соседа в квартиру. Астана, район Есиль.
Аренда 90000₸ с человека. Только парни.
Тел: 8 (700) 111-22-33
WhatsApp: 8 747 555 66 77`;

    const out = extractFromPost(post, TODAY);
    expect(out.phone).toBe("+77001112233");
    expect(out.whatsapp).toBe("+77475556677");
    expect(out.monthlyRent).toBe(90_000);
    expect(out.genderPreference).toBe("male");
  });

  it("reads an Instagram post", () => {
    const post = `Сдам студию. 200 тыс в месяц. Пиши в инстаграм @almaty.rent.home
или instagram.com/almaty.rent.home`;

    const out = extractFromPost(post, TODAY);
    expect(out.instagram).toBe("almaty.rent.home");
    expect(out.monthlyRent).toBe(200_000);
    // No phone in this post — the parser must not invent one.
    expect(out.phone).toBeUndefined();
  });

  it("reads an English post", () => {
    const post = `Room for rent near Nazarbayev University. 120 000 KZT per month.
Available from 15.09.2026. Female students only. Contact: +7 705 999 88 77`;

    const out = extractFromPost(post, TODAY);
    expect(out.monthlyRent).toBe(120_000);
    expect(out.availableFrom).toBe("2026-09-15");
    expect(out.genderPreference).toBe("female");
    expect(out.phone).toBe("+77059998877");
  });

  it("picks the rent, not the deposit, when a post quotes both", () => {
    const post = "Аренда 250 000 тг, депозит 100 000 тг. Тел +7 700 000 00 00";
    expect(extractFromPost(post, TODAY).monthlyRent).toBe(250_000);
  });

  it("understands the 'к' shorthand", () => {
    expect(extractFromPost("Комната 180к в месяц", TODAY).monthlyRent).toBe(180_000);
  });

  it("reads a Kazakh post", () => {
    // `\b` is an ASCII boundary and does not fire between Cyrillic letters, so
    // Kazakh keywords need Unicode lookarounds instead.
    const post = "Бөлме жалға беріледі. Алматы. 130000 тенге.\nҚыз балаға. Телефон +7 708 777 66 55";
    const out = extractFromPost(post, TODAY);
    expect(out.monthlyRent).toBe(130_000);
    expect(out.genderPreference).toBe("female");
    expect(out.phone).toBe("+77087776655");
  });

  it("treats 'директ' as Instagram, which is how the posts phrase it", () => {
    const out = extractFromPost("Сдам студию. 200 тыс. Пишите в директ @almaty.rent.home", TODAY);
    expect(out.instagram).toBe("almaty.rent.home");
    expect(out.telegram).toBeUndefined();
  });

  it("routes a dotted handle to Instagram — Telegram usernames cannot hold a dot", () => {
    const out = extractFromPost("Пишите @almaty.rent.home", TODAY);
    expect(out.instagram).toBe("almaty.rent.home");
    expect(out.telegram).toBeUndefined();
  });

  it("takes t.me links as Telegram", () => {
    const out = extractFromPost("Пишите https://t.me/roomi_host", TODAY);
    expect(out.telegram).toBe("roomi_host");
  });
});

describe("extractFromPost — refuses to guess", () => {
  it("returns nothing for empty input", () => {
    expect(extractFromPost("", TODAY).found).toEqual([]);
  });

  it("leaves gender alone when a post names both", () => {
    // "девушка или парень" is not a requirement, so neither may be set.
    const out = extractFromPost("Сдаю комнату, можно девушка или парень", TODAY);
    expect(out.genderPreference).toBeUndefined();
  });

  it("ignores numbers that are not phone numbers", () => {
    const out = extractFromPost("Квартира 3 комнаты, 8 этаж, 75 кв м", TODAY);
    expect(out.phone).toBeUndefined();
  });

  it("ignores an amount too small to be a monthly rent", () => {
    expect(extractFromPost("Комиссия 5000 тг", TODAY).monthlyRent).toBeUndefined();
  });

  it("does not report a field it did not extract", () => {
    const out = extractFromPost("Просто текст без контактов", TODAY);
    expect(out.found).toEqual([]);
  });

  it("rolls a bare day+month forward rather than into the past", () => {
    // Post read in August saying "с 1 марта" means next March.
    expect(extractFromPost("Заселение с 1 марта", TODAY).availableFrom).toBe("2027-03-01");
  });
});

describe("applyExtraction", () => {
  it("fills only blank fields", () => {
    const form = { phone: "", monthlyRent: 0, telegram: "already_set" };
    const { next, filled } = applyExtraction(form, {
      phone: "+77001112233",
      monthlyRent: 150_000,
      telegram: "extracted_one",
      found: ["phone", "monthlyRent", "telegram"]
    });

    expect(next.phone).toBe("+77001112233");
    expect(next.monthlyRent).toBe(150_000);
    // The admin already typed a Telegram handle: extraction must not touch it.
    expect(next.telegram).toBe("already_set");
    expect(filled).toEqual(["phone", "monthlyRent"]);
  });

  it("ignores extracted keys the form does not have", () => {
    const form = { phone: "" };
    const { next, filled } = applyExtraction(form, { instagram: "x", found: ["instagram"] });
    expect(next).toEqual({ phone: "" });
    expect(filled).toEqual([]);
  });

  it("reports nothing when there is nothing to fill", () => {
    const form = { phone: "+7 700 000 00 00" };
    const { filled } = applyExtraction(form, { phone: "+77001112233", found: ["phone"] });
    expect(filled).toEqual([]);
  });
});
