/**
 * Copy for two homepage sections that were removed from the layout.
 *
 * The "How it works" steps and the FAQ were taken off the homepage as a layout
 * decision. Their content is kept here rather than deleted: it is five
 * questions and four steps, each written in three languages, and it exists
 * nowhere else in the product. Dropping it with the markup would have thrown
 * away the writing along with the layout.
 *
 * Nothing imports this yet. It is here so a /faq page, a support article or a
 * future homepage revision can use it without anyone having to rewrite or
 * re-translate it — and so removing a section stayed a presentation change,
 * which is what was asked for.
 */

import { Home, MessageCircle, Search, Users } from "lucide-react";

export function getSteps(locale: "en" | "ru" | "kz") {
  if (locale === "ru") {
    return [
      {
        icon: Users,
        number: "01",
        title: "Создайте профиль",
        text: "Укажите бюджет, университет, образ жизни и дату заезда, чтобы получать более точные совпадения."
      },
      {
        icon: Search,
        number: "02",
        title: "Ищите и фильтруйте",
        text: "Подбирайте комнаты и соседей по городу, кампусу, бюджету и совместимости."
      },
      {
        icon: MessageCircle,
        number: "03",
        title: "Общайтесь заранее",
        text: "Напишите потенциальным соседям, сравните ожидания и обсудите важные детали до встречи."
      },
      {
        icon: Home,
        number: "04",
        title: "Заселяйтесь уверенно",
        text: "Выбирайте лучший вариант и планируйте переезд вместе без лишнего стресса."
      }
    ];
  }

  if (locale === "kz") {
    return [
      {
        icon: Users,
        number: "01",
        title: "Профиль жасаңыз",
        text: "Дәлірек сәйкестік алу үшін бюджетіңізді, университетіңізді, өмір салтыңызды және көшу күніңізді енгізіңіз."
      },
      {
        icon: Search,
        number: "02",
        title: "Іздеп, сүзгіден өткізіңіз",
        text: "Қала, кампус, бюджет және үйлесім бойынша бөлмелер мен roommate табыңыз."
      },
      {
        icon: MessageCircle,
        number: "03",
        title: "Алдын ала сөйлесіңіз",
        text: "Кездеспей тұрып, ықтимал көршілерге жазып, күтілімдер мен маңызды детальдарды талқылаңыз."
      },
      {
        icon: Home,
        number: "04",
        title: "Сенімді қоныстаныңыз",
        text: "Ең қолайлы нұсқаны таңдап, көшуді бірге жоспарлаңыз."
      }
    ];
  }

  return [
    {
      icon: Users,
      number: "01",
      title: "Create Profile",
      text: "Sign up and share your budget, university, lifestyle, and move-in preferences."
    },
    {
      icon: Search,
      number: "02",
      title: "Browse & Filter",
      text: "Search rooms and roommates by city, university, budget, and compatibility."
    },
    {
      icon: MessageCircle,
      number: "03",
      title: "Connect & Chat",
      text: "Message potential roommates early, compare expectations, and ask the right questions."
    },
    {
      icon: Home,
      number: "04",
      title: "Move In Together",
      text: "Choose the right fit with more confidence and plan the next chapter together."
    }
  ];
}

export function getFaqs(locale: "en" | "ru" | "kz") {
  if (locale === "ru") {
    return [
      {
        question: "Как работает подбор соседа?",
        answer:
          "Система сравнивает бюджет, дату заезда, чистоту, режим сна, гостей и другие привычки, чтобы сильные совпадения поднимались выше."
      },
      {
        question: "Насколько безопасен Roomi?",
        answer:
          "Платформа строится вокруг проверенных профилей, деталей жилья и прозрачной активности, чтобы студентам было спокойнее принимать решения."
      },
      {
        question: "Сколько это стоит?",
        answer:
          "Поиск объявлений, соседей и старт общения остаются доступными, пока продукт растет и дополняется новыми инструментами."
      },
      {
        question: "Можно ли разместить свою комнату или квартиру?",
        answer:
          "Да. Вы можете опубликовать объявление, добавить фотографии, указать пожелания к соседу и общаться напрямую с заинтересованными людьми."
      },
      {
        question: "Какие города покрывает сервис?",
        answer:
          "Сейчас акцент на крупнейших студенческих центрах, таких как Алматы и Астана, с возможностью дальнейшего расширения."
      }
    ];
  }

  if (locale === "kz") {
    return [
      {
        question: "Roommate matching қалай жұмыс істейді?",
        answer:
          "Жүйе бюджет, көшу уақыты, тазалық, ұйқы тәртібі, қонақтар және басқа әдеттерді салыстырып, мықты сәйкестіктерді жоғары қояды."
      },
      {
        question: "Roomi қолдану қауіпсіз бе?",
        answer:
          "Платформа тексерілген профильдерге, тұрғын үй ақпаратына және ашық белсенділікке сүйеніп, студенттерге сенімдірек шешім қабылдауға көмектеседі."
      },
      {
        question: "Қанша тұрады?",
        answer:
          "Хабарландыруларды көру, roommate іздеу және сөйлесуді бастау әзірге қолжетімді және қарапайым болып қалады."
      },
      {
        question: "Өз бөлмемді немесе пәтерімді жариялай аламын ба?",
        answer:
          "Иә. Хабарландыру жариялап, фотосурет қосып, roommate талғамын көрсетіп, қызыққан адамдармен тікелей байланыса аласыз."
      },
      {
        question: "Қай қалалар қамтылған?",
        answer:
          "Қызмет қазір Алматы мен Астана сияқты негізгі студенттік хабтарға бағытталған және кейін кеңейе алады."
      }
    ];
  }

  return [
    {
      question: "How does the roommate matching work?",
      answer:
        "Our match score compares budget, move-in timing, cleanliness, sleep schedule, guests, and other lifestyle preferences so you can shortlist better fits faster."
    },
    {
      question: "Is it safe to use Roomi?",
      answer:
        "The platform is designed around verified profiles, room details, and reportable activity so students can make more confident decisions before meeting."
    },
    {
      question: "How much does it cost?",
      answer:
        "Browsing listings, discovering roommates, and starting conversations can remain accessible while the product grows with premium tools later if needed."
    },
    {
      question: "Can I list my room or apartment?",
      answer:
        "Yes. You can publish a listing, add photos, set roommate preferences, and connect directly with interested students or young professionals."
    },
    {
      question: "What cities in Kazakhstan do you cover?",
      answer:
        "The experience is designed around major student hubs like Almaty and Astana, with room to expand as the listing network grows."
    }
  ];
}
