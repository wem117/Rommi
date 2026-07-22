"use client";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { useLocale } from "@/context/locale-context";
import type { Locale } from "@/lib/i18n";

/*
 * Professional trilingual legal drafts. These are working drafts intended for
 * review by legal counsel before launch — they do not replace legal review.
 */

type LegalContent = {
  title: string;
  updated: string;
  updatedLabel: string;
  intro: string;
  sections: LegalSection[];
};

const CONTENT: Record<Locale, LegalContent> = {
  en: {
    title: "Terms of Service",
    updated: "July 2026",
    updatedLabel: "Last updated",
    intro:
      "These Terms govern your access to and use of Roomi (the “Platform”). By creating an account or using the Platform, you agree to these Terms. If you do not agree, please do not use Roomi.",
    sections: [
      {
        heading: "1. Who can use Roomi",
        paragraphs: [
          "You must be at least 18 years old and able to enter into a binding agreement to use Roomi. You agree to provide accurate information about yourself and to keep it up to date."
        ]
      },
      {
        heading: "2. What Roomi is (and is not)",
        paragraphs: [
          "Roomi is a platform that helps users discover rooms, listings, and potential roommates. We are not a landlord, letting agent, or party to any rental agreement between users. We do not own, manage, inspect, or guarantee any listing, and we are not responsible for the conduct of any user.",
          "Any agreement to rent a room or live together is made directly between the users involved."
        ]
      },
      {
        heading: "3. Your account",
        list: [
          "You are responsible for keeping your login credentials secure and for all activity under your account.",
          "You may sign in with email and password or with a supported provider such as Google.",
          "You may not impersonate another person, create accounts using false information, or transfer your account to someone else."
        ]
      },
      {
        heading: "4. Listings and content",
        paragraphs: [
          "You are responsible for the accuracy and legality of any listing, profile, message, or image you post. You confirm that you have the right to rent or advertise any property you list."
        ],
        list: [
          "No false, misleading, or fraudulent listings.",
          "No discrimination that is unlawful under the laws of the Republic of Kazakhstan.",
          "No harassment, hate speech, spam, or illegal activity.",
          "No content that infringes another person's rights."
        ]
      },
      {
        heading: "5. Prohibited activities",
        paragraphs: ["When using Roomi you must not:"],
        list: [
          "Post fraudulent listings, request deposits or “reservation” fees before a viewing, or attempt any rental scam.",
          "Harass, threaten, defame, or discriminate against other users on grounds prohibited by the laws of the Republic of Kazakhstan.",
          "Collect, scrape, or reuse other users' personal data or contact details without their consent.",
          "Upload malware, attempt to breach security, bypass rate limits, or access accounts or data that are not yours.",
          "Use the Platform for money laundering, subletting fraud, or any activity that is illegal under Kazakhstani law."
        ]
      },
      {
        heading: "6. Moderation, suspension, and termination",
        paragraphs: [
          "We may review, hide, or remove content, and may suspend or terminate accounts that violate these Terms or that we reasonably believe to be harmful, fraudulent, or abusive. Where practical and lawful we will give notice, but we may act immediately in cases of fraud, safety risk, or legal requirement.",
          "You may close your account at any time. Certain records may be retained where required by law or to resolve disputes, as described in our Privacy Policy."
        ]
      },
      {
        heading: "7. Reporting abuse",
        paragraphs: [
          "If a listing or profile is fake, abusive, or fraudulent, use the Report button on that listing or profile, or contact us through the Support page. Reports are routed to our moderation team for review. If you are in immediate danger, contact the police at 102."
        ]
      },
      {
        heading: "8. Intellectual property",
        paragraphs: [
          "The Roomi name, logo, interface, and software are owned by Roomi and protected under the intellectual-property laws of the Republic of Kazakhstan. You may not copy, modify, or redistribute them without permission.",
          "You keep ownership of the content you post (listings, photos, messages). By posting, you grant Roomi a non-exclusive, royalty-free licence to host and display that content for the purpose of operating the Platform."
        ]
      },
      {
        heading: "9. Fees",
        paragraphs: [
          "Browsing listings, discovering roommates, and messaging are currently available at no charge. If we introduce paid features in the future, we will make the pricing clear before you are charged."
        ]
      },
      {
        heading: "10. Disclaimer and limitation of liability",
        paragraphs: [
          "The Platform is provided “as is” and “as available” without warranties of any kind. To the maximum extent permitted by law, Roomi is not liable for any indirect or consequential loss, or for any loss arising from your interactions with other users, any rental agreement, or any content on the Platform. You use Roomi at your own risk and are responsible for your own safety — see our Safety & Security guidance."
        ]
      },
      {
        heading: "11. Dispute resolution and governing law",
        paragraphs: [
          "These Terms are governed by the laws of the Republic of Kazakhstan. We encourage you to contact our Support team first so we can try to resolve any issue informally.",
          "If a dispute cannot be resolved informally, it shall be submitted to the competent courts of the Republic of Kazakhstan, unless mandatory consumer-protection rules provide otherwise."
        ]
      },
      {
        heading: "12. Changes to these Terms",
        paragraphs: [
          "We may update these Terms from time to time. If a change is material we will take reasonable steps to notify you; continued use of the Platform after an update means you accept the revised Terms. Questions can be sent through the Support page."
        ]
      }
    ]
  },
  ru: {
    title: "Условия использования",
    updated: "июль 2026 г.",
    updatedLabel: "Последнее обновление",
    intro:
      "Настоящие Условия регулируют доступ к платформе Roomi («Платформа») и её использование. Создавая аккаунт или используя Платформу, вы соглашаетесь с настоящими Условиями. Если вы с ними не согласны, пожалуйста, не используйте Roomi.",
    sections: [
      {
        heading: "1. Кто может пользоваться Roomi",
        paragraphs: [
          "Пользоваться Roomi могут лица, достигшие 18 лет и обладающие дееспособностью, необходимой для заключения юридически обязательного соглашения. Вы обязуетесь предоставлять о себе достоверные сведения и поддерживать их в актуальном состоянии."
        ]
      },
      {
        heading: "2. Чем является Roomi (и чем не является)",
        paragraphs: [
          "Roomi — это платформа, которая помогает пользователям находить комнаты, объявления и потенциальных соседей. Мы не являемся арендодателем, риелторским агентством или стороной какого-либо договора аренды между пользователями. Мы не владеем жильём, не управляем им, не осматриваем его, не гарантируем достоверность каких-либо объявлений и не несём ответственности за поведение пользователей.",
          "Любые договорённости об аренде комнаты или совместном проживании заключаются непосредственно между самими пользователями."
        ]
      },
      {
        heading: "3. Ваш аккаунт",
        list: [
          "Вы несёте ответственность за сохранность своих учётных данных и за все действия, совершённые с использованием вашего аккаунта.",
          "Вход возможен по адресу электронной почты и паролю либо через поддерживаемого провайдера, например Google.",
          "Запрещается выдавать себя за другое лицо, создавать аккаунты с использованием ложных сведений или передавать свой аккаунт третьим лицам."
        ]
      },
      {
        heading: "4. Объявления и контент",
        paragraphs: [
          "Вы отвечаете за достоверность и законность любых объявлений, профилей, сообщений и изображений, которые вы размещаете. Вы подтверждаете, что имеете право сдавать в аренду или рекламировать жильё, указанное в вашем объявлении."
        ],
        list: [
          "Запрещаются ложные, вводящие в заблуждение и мошеннические объявления.",
          "Запрещается дискриминация, противоречащая законодательству Республики Казахстан.",
          "Запрещаются домогательства, язык вражды, спам и незаконная деятельность.",
          "Запрещается контент, нарушающий права других лиц."
        ]
      },
      {
        heading: "5. Запрещённые действия",
        paragraphs: ["При использовании Roomi запрещается:"],
        list: [
          "Размещать мошеннические объявления, требовать задаток или «плату за бронь» до просмотра жилья, а также совершать любые иные мошеннические действия, связанные с арендой.",
          "Преследовать, запугивать, порочить других пользователей либо дискриминировать их по признакам, запрещённым законодательством Республики Казахстан.",
          "Собирать, копировать и использовать персональные данные и контактные сведения других пользователей без их согласия.",
          "Загружать вредоносные программы, пытаться нарушить безопасность Платформы, обходить установленные ограничения, получать доступ к чужим аккаунтам или данным.",
          "Использовать Платформу для отмывания денег, мошенничества с субарендой или любой иной деятельности, незаконной по законодательству Республики Казахстан."
        ]
      },
      {
        heading: "6. Модерация, приостановка и прекращение доступа",
        paragraphs: [
          "Мы вправе проверять, скрывать и удалять контент, а также приостанавливать или прекращать действие аккаунтов, которые нарушают настоящие Условия либо которые мы обоснованно считаем вредоносными, мошенническими или оскорбительными. Когда это возможно и законно, мы направим уведомление, однако при мошенничестве, угрозе безопасности или требовании закона можем действовать незамедлительно.",
          "Вы можете удалить свой аккаунт в любой момент. Отдельные записи могут сохраняться, если это требуется по закону или необходимо для разрешения споров, как описано в нашей Политике конфиденциальности."
        ]
      },
      {
        heading: "7. Сообщения о нарушениях",
        paragraphs: [
          "Если объявление или профиль выглядит поддельным, оскорбительным или мошенническим, воспользуйтесь кнопкой «Пожаловаться» на этом объявлении или профиле либо свяжитесь с нами через страницу поддержки. Жалобы поступают нашей команде модерации на проверку. Если вам угрожает непосредственная опасность, звоните в полицию по номеру 102."
        ]
      },
      {
        heading: "8. Интеллектуальная собственность",
        paragraphs: [
          "Название, логотип, интерфейс и программное обеспечение Roomi принадлежат Roomi и охраняются законодательством Республики Казахстан об интеллектуальной собственности. Их копирование, изменение и распространение без разрешения запрещены.",
          "Права на размещаемый вами контент (объявления, фотографии, сообщения) сохраняются за вами. Размещая контент, вы предоставляете Roomi неисключительную безвозмездную лицензию на его хранение и отображение в целях работы Платформы."
        ]
      },
      {
        heading: "9. Платные услуги",
        paragraphs: [
          "Просмотр объявлений, поиск соседей и обмен сообщениями в настоящее время бесплатны. Если в будущем появятся платные функции, условия оплаты будут ясно указаны до списания средств."
        ]
      },
      {
        heading: "10. Отказ от гарантий и ограничение ответственности",
        paragraphs: [
          "Платформа предоставляется «как есть» и «по мере доступности», без каких-либо гарантий. В максимально допустимой законом степени Roomi не несёт ответственности за косвенные убытки, а также за убытки, возникшие в связи с вашим взаимодействием с другими пользователями, каким-либо договором аренды или контентом на Платформе. Вы используете Roomi на свой риск и самостоятельно отвечаете за свою безопасность — см. страницу «Безопасность»."
        ]
      },
      {
        heading: "11. Разрешение споров и применимое право",
        paragraphs: [
          "Настоящие Условия регулируются законодательством Республики Казахстан. Рекомендуем сначала обратиться в нашу службу поддержки — большинство вопросов удаётся урегулировать в досудебном порядке.",
          "Если спор не удаётся урегулировать во внесудебном порядке, он подлежит рассмотрению компетентными судами Республики Казахстан, если иное не предусмотрено императивными нормами о защите прав потребителей."
        ]
      },
      {
        heading: "12. Изменения настоящих Условий",
        paragraphs: [
          "Мы можем время от времени обновлять настоящие Условия. О существенных изменениях мы постараемся уведомить вас разумным способом; продолжение использования Платформы после вступления изменений в силу означает ваше согласие с обновлёнными Условиями. Вопросы можно направлять через страницу поддержки."
        ]
      }
    ]
  },
  kz: {
    title: "Қолдану шарттары",
    updated: "2026 жылғы шілде",
    updatedLabel: "Соңғы жаңартылған күні",
    intro:
      "Осы Шарттар Roomi платформасына («Платформа») қол жеткізуді және оны пайдалануды реттейді. Аккаунт тіркеу немесе Платформаны пайдалану арқылы сіз осы Шарттармен келісесіз. Келіспесеңіз, Roomi-ді пайдаланбауыңызды сұраймыз.",
    sections: [
      {
        heading: "1. Roomi-ді кім пайдалана алады",
        paragraphs: [
          "Roomi-ді пайдалану үшін сізге кемінде 18 жас толуы және заңды күші бар келісім жасауға қабілетті болуыңыз қажет. Сіз өзіңіз туралы шынайы мәліметтер беруге және оларды өзекті күйде ұстауға міндеттенесіз."
        ]
      },
      {
        heading: "2. Roomi деген не (және не емес)",
        paragraphs: [
          "Roomi — пайдаланушыларға бөлмелерді, хабарландыруларды және әлеуетті көршілерді табуға көмектесетін платформа. Біз жалға беруші де, риелторлық агенттік те емеспіз және пайдаланушылар арасындағы қандай да бір жалдау шартының тарапы болып табылмаймыз. Біз хабарландыруларда көрсетілген тұрғын үйге иелік етпейміз, оны басқармаймыз, тексермейміз, ешбір хабарландырудың дұрыстығына кепілдік бермейміз және пайдаланушылардың әрекеттері үшін жауап бермейміз.",
          "Бөлмені жалдау немесе бірге тұру туралы кез келген келісім тікелей пайдаланушылардың өздері арасында жасалады."
        ]
      },
      {
        heading: "3. Сіздің аккаунтыңыз",
        list: [
          "Кіру деректеріңіздің қауіпсіздігі және аккаунтыңыз арқылы жасалған барлық әрекеттер үшін сіз жауап бересіз.",
          "Жүйеге электрондық пошта мен құпиясөз арқылы немесе Google сияқты қолдау көрсетілетін провайдер арқылы кіруге болады.",
          "Басқа адамның атынан әрекет етуге, жалған мәліметтермен аккаунт тіркеуге немесе аккаунтыңызды басқа адамға беруге тыйым салынады."
        ]
      },
      {
        heading: "4. Хабарландырулар мен контент",
        paragraphs: [
          "Сіз орналастыратын хабарландырулардың, профильдердің, хабарламалар мен суреттердің дұрыстығы мен заңдылығы үшін өзіңіз жауап бересіз. Хабарландыруда көрсетілген тұрғын үйді жалға беруге немесе жарнамалауға құқығыңыз бар екенін растайсыз."
        ],
        list: [
          "Жалған, жаңылыстыратын немесе алаяқтық хабарландыруларға тыйым салынады.",
          "Қазақстан Республикасының заңнамасына қайшы келетін кемсітушілікке тыйым салынады.",
          "Қудалауға, өшпенділік тіліне, спамға және заңсыз әрекеттерге тыйым салынады.",
          "Басқа адамдардың құқықтарын бұзатын контентке тыйым салынады."
        ]
      },
      {
        heading: "5. Тыйым салынған әрекеттер",
        paragraphs: ["Roomi-ді пайдалану кезінде мыналарға тыйым салынады:"],
        list: [
          "Алаяқтық хабарландырулар орналастыру, тұрғын үйді қарап шықпас бұрын кепілпұл немесе «брондау ақысын» талап ету, сондай-ақ жалдауға қатысты кез келген өзге алаяқтық әрекеттер жасау.",
          "Басқа пайдаланушыларды қудалау, қорқыту, жала жабу немесе Қазақстан Республикасының заңнамасында тыйым салынған белгілер бойынша кемсіту.",
          "Басқа пайдаланушылардың дербес деректері мен байланыс мәліметтерін олардың келісімінсіз жинау, көшіру және пайдалану.",
          "Зиянды бағдарламалар жүктеу, Платформаның қауіпсіздігін бұзуға әрекеттену, белгіленген шектеулерді айналып өту, өзгенің аккаунтына немесе деректеріне қол жеткізу.",
          "Платформаны ақшаны жылыстату, қосымша жалдау алаяқтығы немесе Қазақстан Республикасының заңнамасы бойынша заңсыз кез келген өзге әрекет үшін пайдалану."
        ]
      },
      {
        heading: "6. Модерация, аккаунтты тоқтата тұру және тоқтату",
        paragraphs: [
          "Біз контентті тексеруге, жасыруға немесе жоюға, сондай-ақ осы Шарттарды бұзатын не негізді түрде зиянды, алаяқтық немесе балағаттық деп бағаланатын аккаунттарды тоқтата тұруға немесе жабуға құқылымыз. Мүмкіндігінше алдын ала хабарлаймыз, алайда алаяқтық, қауіпсіздікке қатер немесе заң талабы болған жағдайда дереу әрекет ете аламыз.",
          "Аккаунтыңызды кез келген уақытта жоя аласыз. Кейбір жазбалар заң талап еткен немесе дауларды шешу үшін қажет болған жағдайда сақталуы мүмкін — толығырақ Құпиялылық саясатында."
        ]
      },
      {
        heading: "7. Бұзушылық туралы хабарлау",
        paragraphs: [
          "Хабарландыру немесе профиль жалған, балағаттық немесе алаяқтық сипатта болса, сол хабарландырудағы не профильдегі «Шағымдану» батырмасын пайдаланыңыз немесе Қолдау беті арқылы бізге хабарласыңыз. Шағымдар модерация тобына тексеруге жіберіледі. Тікелей қауіп төнсе, 102 нөмірі арқылы полицияға хабарласыңыз."
        ]
      },
      {
        heading: "8. Зияткерлік меншік",
        paragraphs: [
          "Roomi атауы, логотипі, интерфейсі және бағдарламалық қамтамасы Roomi-ге тиесілі және Қазақстан Республикасының зияткерлік меншік туралы заңнамасымен қорғалады. Оларды рұқсатсыз көшіруге, өзгертуге және таратуға болмайды.",
          "Сіз орналастырған контентке (хабарландырулар, фотосуреттер, хабарламалар) құқықтар өзіңізде қалады. Контентті орналастыра отырып, сіз Roomi-ге оны Платформаның жұмысы мақсатында сақтауға және көрсетуге айрықша емес, өтеусіз лицензия бересіз."
        ]
      },
      {
        heading: "9. Ақылы қызметтер",
        paragraphs: [
          "Хабарландыруларды қарау, көрші іздеу және хабар алмасу қазіргі уақытта тегін. Болашақта ақылы функциялар енгізілсе, төлем шарттары қаражат алынғанға дейін анық көрсетіледі."
        ]
      },
      {
        heading: "10. Кепілдіктерден бас тарту және жауапкершілікті шектеу",
        paragraphs: [
          "Платформа «сол қалпында» және «қолжетімділігіне қарай» ұсынылады, ешқандай кепілдіксіз. Заң рұқсат ететін барынша шекте Roomi жанама залал үшін, сондай-ақ басқа пайдаланушылармен өзара әрекеттесуіңізден, кез келген жалдау шартынан немесе Платформадағы контенттен туындаған залал үшін жауап бермейді. Roomi-ді өз тәуекеліңізбен пайдаланасыз және өз қауіпсіздігіңізге өзіңіз жауап бересіз — «Қауіпсіздік» бетін қараңыз."
        ]
      },
      {
        heading: "11. Дауларды шешу және қолданылатын құқық",
        paragraphs: [
          "Осы Шарттар Қазақстан Республикасының заңнамасымен реттеледі. Алдымен қолдау қызметіне жүгінуді ұсынамыз — мәселелердің көпшілігін сотқа жеткізбей шешуге болады.",
          "Дау келіссөздер арқылы шешілмесе, тұтынушылардың құқықтарын қорғау туралы императивтік нормаларда өзгеше көзделмесе, ол Қазақстан Республикасының құзыретті соттарының қарауына беріледі."
        ]
      },
      {
        heading: "12. Осы Шарттардағы өзгерістер",
        paragraphs: [
          "Біз осы Шарттарды мезгіл-мезгіл жаңартып отыруымыз мүмкін. Елеулі өзгерістер туралы сізге хабарлауға тырысамыз; өзгерістер күшіне енгеннен кейін Платформаны пайдалануды жалғастыру жаңартылған Шарттармен келіскеніңізді білдіреді. Сұрақтарды Қолдау беті арқылы жіберуге болады."
        ]
      }
    ]
  }
};

export function TermsContent() {
  const { locale } = useLocale();
  return <LegalPage {...CONTENT[locale]} />;
}
