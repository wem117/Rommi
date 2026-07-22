"use client";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { useLocale } from "@/context/locale-context";
import type { Locale } from "@/lib/i18n";

type LegalContent = {
  title: string;
  updated: string;
  updatedLabel: string;
  intro: string;
  sections: LegalSection[];
};

const CONTENT: Record<Locale, LegalContent> = {
  en: {
    title: "Safety & Security",
    updated: "July 2026",
    updatedLabel: "Last updated",
    intro:
      "Roomi helps students and young professionals across Kazakhstan find rooms and roommates. Most people on the platform are genuine, but renting and living with someone new always carries risk. Use the guidance below to protect yourself before, during, and after a match.",
    sections: [
      {
        heading: "Before you meet",
        paragraphs: [
          "Keep the first conversations inside Roomi chat. You do not need to share your phone number, home address, or workplace to arrange a viewing."
        ],
        list: [
          "Ask for the person's university or employer and confirm details during a short video call before meeting.",
          "Be cautious if someone refuses a call, rushes you, or pushes the conversation to WhatsApp or Telegram immediately.",
          "Search the listing photos — recycled or stock-looking images are a common sign of a fake advert."
        ]
      },
      {
        heading: "Viewing a room",
        list: [
          "Always view the room in person before paying anything. Never rent based on photos alone.",
          "Bring a friend or tell someone where you are going, who you are meeting, and when you expect to be back.",
          "Meet during daylight and check that keys, locks, water, heating, and electricity actually work.",
          "Confirm who else lives in the apartment and who the contract will be with."
        ]
      },
      {
        heading: "Money and deposits",
        paragraphs: [
          "Financial pressure is the clearest warning sign of a scam. A legitimate landlord or roommate will never need a deposit before you have seen the room."
        ],
        list: [
          "Do not transfer a deposit, prepayment, or \"reservation fee\" (бронь) before viewing the room and meeting the person.",
          "Prefer traceable payments over cash, and always get a receipt or written confirmation of any money paid.",
          "Be extremely wary of anyone claiming to be abroad who asks you to pay before viewing.",
          "For a rental, agree the rent, deposit amount, utilities (коммунальные услуги), and move-in date in writing."
        ]
      },
      {
        heading: "Signing an agreement",
        paragraphs: [
          "A written rental agreement (договор аренды) protects both sides. Confirm the landlord actually has the right to rent the property, and keep a copy of the signed agreement and the passport/ID details of the other party."
        ]
      },
      {
        heading: "Living together safely",
        list: [
          "Agree house rules early — guests, quiet hours, cleaning, and how shared bills are split.",
          "Keep your valuables and documents secure, especially in the first weeks.",
          "Trust your instincts. If a living situation feels unsafe, prioritise leaving over losing a deposit."
        ]
      },
      {
        heading: "Reporting a problem",
        paragraphs: [
          "If a listing or profile looks fake, abusive, or fraudulent, use the Report button on the listing or profile so our team can review and remove it. If you are in immediate danger, contact the police at 102.",
          "Roomi is a platform that connects people; we do not own the listings and cannot guarantee any rental. Staying cautious is the best protection."
        ]
      }
    ]
  },
  ru: {
    title: "Безопасность",
    updated: "июль 2026 г.",
    updatedLabel: "Последнее обновление",
    intro:
      "Roomi помогает студентам и молодым специалистам по всему Казахстану находить жильё и соседей. Большинство пользователей платформы — добросовестные люди, однако аренда и совместное проживание с новым человеком всегда связаны с риском. Следуйте рекомендациям ниже, чтобы защитить себя до, во время и после знакомства.",
    sections: [
      {
        heading: "Перед встречей",
        paragraphs: [
          "Ведите первые переписки внутри чата Roomi. Чтобы договориться о просмотре, не обязательно сообщать номер телефона, домашний адрес или место работы."
        ],
        list: [
          "Спросите, в каком университете человек учится или где работает, и подтвердите детали в коротком видеозвонке до встречи.",
          "Насторожитесь, если собеседник отказывается от звонка, торопит вас или сразу переводит общение в WhatsApp или Telegram.",
          "Проверьте фотографии объявления через поиск по картинке — использованные повторно или «стоковые» изображения часто указывают на фальшивое объявление."
        ]
      },
      {
        heading: "Просмотр жилья",
        list: [
          "Всегда осматривайте жильё лично, прежде чем платить. Никогда не арендуйте только по фотографиям.",
          "Возьмите с собой друга или сообщите близким, куда вы идёте, с кем встречаетесь и когда планируете вернуться.",
          "Встречайтесь в светлое время суток и проверьте, что ключи, замки, вода, отопление и электричество действительно работают.",
          "Уточните, кто ещё живёт в квартире и с кем будет заключён договор."
        ]
      },
      {
        heading: "Деньги и задаток",
        paragraphs: [
          "Финансовое давление — самый явный признак мошенничества. Добросовестному арендодателю или соседу не нужен задаток до того, как вы увидели жильё."
        ],
        list: [
          "Не переводите задаток, предоплату или «плату за бронь» до просмотра жилья и личной встречи.",
          "Отдавайте предпочтение отслеживаемым платежам вместо наличных и всегда берите расписку или письменное подтверждение оплаты.",
          "Будьте предельно осторожны с теми, кто якобы находится за границей и просит оплатить жильё до просмотра.",
          "При аренде письменно согласуйте размер арендной платы, задатка, порядок оплаты коммунальных услуг и дату заселения."
        ]
      },
      {
        heading: "Заключение договора",
        paragraphs: [
          "Письменный договор аренды защищает обе стороны. Убедитесь, что арендодатель действительно вправе сдавать жильё, и сохраните копию подписанного договора и данные удостоверения личности другой стороны."
        ]
      },
      {
        heading: "Безопасная жизнь вместе",
        list: [
          "Заранее договоритесь о правилах: гости, время тишины, уборка и порядок оплаты общих счетов.",
          "Храните ценные вещи и документы в надёжном месте, особенно в первые недели.",
          "Доверяйте своей интуиции. Если обстановка кажется небезопасной, уехать важнее, чем сохранить задаток."
        ]
      },
      {
        heading: "Сообщить о проблеме",
        paragraphs: [
          "Если объявление или профиль выглядит поддельным, оскорбительным или мошенническим, нажмите кнопку «Пожаловаться» на объявлении или профиле, чтобы наша команда проверила и удалила его. Если вам угрожает непосредственная опасность, звоните в полицию по номеру 102.",
          "Roomi — платформа, которая помогает людям находить друг друга; мы не владеем объявлениями и не можем гарантировать ни одну аренду. Осмотрительность — лучшая защита."
        ]
      }
    ]
  },
  kz: {
    title: "Қауіпсіздік",
    updated: "2026 жылғы шілде",
    updatedLabel: "Соңғы жаңартылған күні",
    intro:
      "Roomi Қазақстандағы студенттер мен жас мамандарға баспана мен көрші табуға көмектеседі. Платформа пайдаланушыларының басым бөлігі — адал адамдар, дегенмен жаңа адаммен пәтер жалдау немесе бірге тұру әрқашан тәуекелмен байланысты. Танысқанға дейін, кездесу кезінде және одан кейін өзіңізді қорғау үшін төмендегі кеңестерді ұстаныңыз.",
    sections: [
      {
        heading: "Кездесу алдында",
        paragraphs: [
          "Алғашқы әңгімелерді Roomi чатында жүргізіңіз. Қарап шығуды келісу үшін телефон нөміріңізді, үй мекенжайыңызды немесе жұмыс орныңызды айту міндетті емес."
        ],
        list: [
          "Адамның қай университетте оқитынын немесе қайда жұмыс істейтінін сұраңыз және кездеспес бұрын қысқа бейнеқоңырау арқылы мәліметтерді растаңыз.",
          "Егер адам қоңыраудан бас тартса, сізді асықтырса немесе бірден WhatsApp не Telegram-ға өтуді ұсынса, сақ болыңыз.",
          "Хабарландыру суреттерін сурет бойынша іздеу арқылы тексеріңіз — қайта пайдаланылған немесе «сток» суреттер жалған хабарландырудың жиі кездесетін белгісі."
        ]
      },
      {
        heading: "Тұрғын үйді қарау",
        list: [
          "Ақша төлемес бұрын үйді әрқашан өзіңіз барып көріңіз. Тек фотосуретке қарап ешқашан жалдамаңыз.",
          "Жаныңызға дос ертіп барыңыз немесе жақындарыңызға қайда баратыныңызды, кіммен кездесетініңізді және қашан оралатыныңызды айтыңыз.",
          "Күндізгі уақытта кездесіңіз және кілттердің, құлыптардың, судың, жылу мен электр жарығының шын мәнінде жұмыс істейтінін тексеріңіз.",
          "Пәтерде тағы кім тұратынын және шарт кіммен жасалатынын нақтылаңыз."
        ]
      },
      {
        heading: "Ақша және кепілпұл",
        paragraphs: [
          "Қаржылай қысым — алаяқтықтың ең айқын белгісі. Адал жалға беруші немесе көрші сіз үйді көрмей тұрып кепілпұл талап етпейді."
        ],
        list: [
          "Үйді қарап шығып, адаммен жүздеспей тұрып кепілпұл, алдын ала төлем немесе «брондау ақысын» аудармаңыз.",
          "Қолма-қол ақшадан гөрі ізі қалатын төлемдерді таңдаңыз және әрқашан түбіртек немесе төлемнің жазбаша растамасын алыңыз.",
          "«Шетелде жүрмін» деп, үйді көрсетпей тұрып төлем сұрайтындардан аса сақ болыңыз.",
          "Жалдау кезінде жалдау ақысын, кепілпұл мөлшерін, коммуналдық қызметтер төлемін және кірген күнді жазбаша келісіңіз."
        ]
      },
      {
        heading: "Шарт жасасу",
        paragraphs: [
          "Жазбаша жалдау шарты екі тарапты да қорғайды. Жалға берушінің үйді жалға беруге шын мәнінде құқығы бар екеніне көз жеткізіңіз және қол қойылған шарттың көшірмесі мен екінші тараптың жеке куәлік деректерін сақтап қойыңыз."
        ]
      },
      {
        heading: "Бірге қауіпсіз тұру",
        list: [
          "Үй ережелерін ертерек келісіңіз — қонақтар, тыныштық сағаттары, тазалық және ортақ шоттарды бөлу тәртібі.",
          "Құнды заттар мен құжаттарыңызды, әсіресе алғашқы апталарда, сенімді жерде сақтаңыз.",
          "Түйсігіңізге сеніңіз. Жағдай қауіпті көрінсе, кепілпұлдан айырылып қалудан гөрі кетіп қалған дұрыс."
        ]
      },
      {
        heading: "Мәселе туралы хабарлау",
        paragraphs: [
          "Хабарландыру немесе профиль жалған, балағаттық немесе алаяқтық сипатта көрінсе, сол хабарландырудағы не профильдегі «Шағымдану» батырмасын басыңыз — біздің топ оны тексеріп, жояды. Тікелей қауіп төнсе, 102 нөмірі арқылы полицияға хабарласыңыз.",
          "Roomi — адамдарды бір-бірімен байланыстыратын платформа; біз хабарландыруларға иелік етпейміз және ешбір жалдауға кепілдік бере алмаймыз. Сақтық — ең жақсы қорғаныс."
        ]
      }
    ]
  }
};

export function SafetyContent() {
  const { locale } = useLocale();
  return <LegalPage {...CONTENT[locale]} />;
}
