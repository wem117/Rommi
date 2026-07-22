"use client";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { useLocale } from "@/context/locale-context";
import type { Locale } from "@/lib/i18n";

const SUPPORT_EMAIL = "roomi.support@gmail.com";

type LegalContent = {
  title: string;
  updated: string;
  updatedLabel: string;
  intro: string;
  sections: LegalSection[];
};

/** The "Contact us" section body with a mailto button, localized per call. */
function ContactBody({
  lead,
  buttonLabel,
  subject,
  copyHint
}: {
  lead: string;
  buttonLabel: string;
  subject: string;
  copyHint: string;
}) {
  return (
    <div className="space-y-4">
      <p>{lead}</p>
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        {buttonLabel}
      </a>
      <p className="text-foreground/60">
        {copyHint}{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}

const CONTENT: Record<Locale, LegalContent> = {
  en: {
    title: "Support",
    updated: "July 2026",
    updatedLabel: "Last updated",
    intro:
      "Need a hand? Our team is here to help with anything on Roomi — account questions, listings, roommate matches, verification, or reporting a problem. We typically reply within one business day.",
    sections: [
      {
        heading: "Contact us",
        body: (
          <ContactBody
            lead="The fastest way to reach us is by email. Tap the button below to open your mail app with a message ready to send."
            buttonLabel={`Email ${SUPPORT_EMAIL}`}
            subject="Roomi support request"
            copyHint="Prefer to copy it?"
          />
        )
      },
      {
        heading: "Reporting a listing or profile",
        paragraphs: [
          "If a listing or profile looks fake, abusive, or fraudulent, use the Report button directly on that listing or profile — it routes straight to our moderation team for review and removal.",
          "For anything urgent involving your safety, contact the police at 102. See our Safety & Security page for step-by-step guidance on meeting, viewing, and deposits."
        ]
      },
      {
        heading: "Account help",
        list: [
          "Trouble signing in or resetting your password — email us and we'll help you recover access.",
          "Want your account or a listing removed — email us from the address on your account and we'll take care of it.",
          "Questions about verification, matches, or how Roomi works — we're happy to walk you through it."
        ]
      },
      {
        heading: "Before you email",
        paragraphs: [
          "To help us resolve things quickly, include the email address on your account and, where relevant, a link to the listing or profile involved and a short description of what happened."
        ]
      }
    ]
  },
  ru: {
    title: "Поддержка",
    updated: "июль 2026 г.",
    updatedLabel: "Последнее обновление",
    intro:
      "Нужна помощь? Наша команда готова помочь с любым вопросом на Roomi — аккаунт, объявления, подбор соседей, верификация или жалоба. Обычно мы отвечаем в течение одного рабочего дня.",
    sections: [
      {
        heading: "Связаться с нами",
        body: (
          <ContactBody
            lead="Быстрее всего написать нам на почту. Нажмите кнопку ниже — откроется почтовое приложение с готовым письмом."
            buttonLabel={`Написать на ${SUPPORT_EMAIL}`}
            subject="Обращение в поддержку Roomi"
            copyHint="Удобнее скопировать адрес?"
          />
        )
      },
      {
        heading: "Пожаловаться на объявление или профиль",
        paragraphs: [
          "Если объявление или профиль выглядит поддельным, оскорбительным или мошенническим, воспользуйтесь кнопкой «Пожаловаться» прямо на объявлении или профиле — жалоба сразу поступит нашей команде модерации на проверку и удаление.",
          "В экстренной ситуации, связанной с вашей безопасностью, звоните в полицию по номеру 102. Пошаговые рекомендации о встречах, просмотрах и задатках — на странице «Безопасность»."
        ]
      },
      {
        heading: "Помощь с аккаунтом",
        list: [
          "Не получается войти или сбросить пароль — напишите нам, и мы поможем восстановить доступ.",
          "Хотите удалить аккаунт или объявление — напишите с адреса, на который зарегистрирован аккаунт, и мы всё сделаем.",
          "Вопросы о верификации, подборе соседей или работе Roomi — с радостью всё объясним."
        ]
      },
      {
        heading: "Перед тем как написать",
        paragraphs: [
          "Чтобы мы могли помочь быстрее, укажите адрес электронной почты вашего аккаунта и, если это уместно, ссылку на объявление или профиль и краткое описание ситуации."
        ]
      }
    ]
  },
  kz: {
    title: "Қолдау",
    updated: "2026 жылғы шілде",
    updatedLabel: "Соңғы жаңартылған күні",
    intro:
      "Көмек керек пе? Біздің топ Roomi-ге қатысты кез келген сұрақта көмектесуге дайын — аккаунт, хабарландырулар, көрші іздеу, верификация немесе шағым. Әдетте бір жұмыс күні ішінде жауап береміз.",
    sections: [
      {
        heading: "Бізбен байланысу",
        body: (
          <ContactBody
            lead="Бізге хат жазу — ең жылдам жол. Төмендегі батырманы бассаңыз, дайын хаты бар пошта қосымшасы ашылады."
            buttonLabel={`${SUPPORT_EMAIL} мекенжайына жазу`}
            subject="Roomi қолдау қызметіне өтініш"
            copyHint="Мекенжайды көшіру ыңғайлы ма?"
          />
        )
      },
      {
        heading: "Хабарландыруға немесе профильге шағымдану",
        paragraphs: [
          "Хабарландыру немесе профиль жалған, балағаттық немесе алаяқтық сипатта болса, сол хабарландырудағы не профильдегі «Шағымдану» батырмасын пайдаланыңыз — шағым бірден модерация тобына тексеруге түседі.",
          "Қауіпсіздігіңізге қатысты шұғыл жағдайда 102 нөмірі арқылы полицияға хабарласыңыз. Кездесу, қарап шығу және кепілпұл туралы қадамдық кеңестер — «Қауіпсіздік» бетінде."
        ]
      },
      {
        heading: "Аккаунтқа қатысты көмек",
        list: [
          "Кіре алмай жатсаңыз немесе құпиясөзді қалпына келтіре алмасаңыз — бізге жазыңыз, қолжетімділікті қалпына келтіруге көмектесеміз.",
          "Аккаунтты немесе хабарландыруды жойғыңыз келсе — аккаунт тіркелген поштадан жазыңыз, бәрін реттейміз.",
          "Верификация, көрші іріктеу немесе Roomi-дің жұмысы туралы сұрақтарыңызға қуана жауап береміз."
        ]
      },
      {
        heading: "Жазбас бұрын",
        paragraphs: [
          "Мәселені жылдам шешуімізге көмектесу үшін аккаунтыңыздың электрондық поштасын, қажет болса — қатысты хабарландыру не профильге сілтемені және не болғанының қысқаша сипаттамасын көрсетіңіз."
        ]
      }
    ]
  }
};

export function SupportContent() {
  const { locale } = useLocale();
  return <LegalPage {...CONTENT[locale]} />;
}
