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
    title: "Privacy Policy",
    updated: "July 2026",
    updatedLabel: "Last updated",
    intro:
      "This Privacy Policy explains what personal data Roomi collects, why we collect it, and the choices you have. Roomi acts as the operator of your personal data and processes it in accordance with the Law of the Republic of Kazakhstan No. 94-V of 21 May 2013 “On Personal Data and its Protection”. We aim to collect only what we need to run the Platform and to help you find a room or roommate safely.",
    sections: [
      {
        heading: "1. Data we collect",
        list: [
          "Account data: your email address and authentication details (including data from Google sign-in if you use it).",
          "Profile data you choose to provide: name, age, gender, university, budget, lifestyle preferences, bio, and photos.",
          "Listing data: room details, location, price, and images you publish.",
          "Usage data: messages you send, listings you view or favourite, and reports you submit.",
          "Technical data: basic device and log information needed to operate and secure the service."
        ]
      },
      {
        heading: "2. How we use your data",
        list: [
          "To create your account and show your profile or listings to other users.",
          "To match you with compatible roommates and relevant rooms.",
          "To enable messaging between users.",
          "To moderate content, investigate reports, and keep the community safe.",
          "To maintain, secure, and improve the Platform."
        ]
      },
      {
        heading: "3. What other users can see",
        paragraphs: [
          "Your profile and any listings you publish are visible to other users to make matching possible. Do not put information in your public profile that you are not comfortable sharing. Your email and password are never shown to other users."
        ]
      },
      {
        heading: "4. Storage and processing",
        paragraphs: [
          "Your data is stored using Supabase (authentication, database, and file storage). We apply access controls so that private data — such as your messages and account details — is not publicly accessible. No online service can be guaranteed to be perfectly secure, so please use a strong, unique password."
        ]
      },
      {
        heading: "5. Legal basis and consent",
        paragraphs: [
          "We process your personal data on the basis of your consent (given when you create an account and publish a profile or listing), to perform our service to you, to comply with legal obligations, and for our legitimate interest in keeping the Platform safe. You may withdraw consent at any time by editing your profile or deleting your account, which may limit features that rely on that data."
        ]
      },
      {
        heading: "6. Cookies and local storage",
        paragraphs: [
          "Roomi uses strictly necessary cookies and browser local storage to keep you signed in, remember your language choice, and keep your last search filters. If analytics are enabled, aggregated, non-identifying usage statistics may be collected to improve the service. You can clear this data through your browser at any time."
        ]
      },
      {
        heading: "7. Sharing",
        paragraphs: [
          "We do not sell your personal data. We share data only with service providers that help us run the Platform (such as our authentication, database, and file-storage provider, Supabase) under appropriate confidentiality obligations, and where required by the law of the Republic of Kazakhstan or a lawful request from a competent authority."
        ]
      },
      {
        heading: "8. Data retention",
        paragraphs: [
          "We keep your personal data while your account is active. After you delete your account we remove or anonymise your personal data within a reasonable period, except where retention is required to comply with the law of the Republic of Kazakhstan, resolve disputes, or prevent fraud and abuse."
        ]
      },
      {
        heading: "9. Your rights",
        paragraphs: ["Under the personal-data legislation of the Republic of Kazakhstan you have the right to:"],
        list: [
          "Access and correct your personal data — you can view and edit it at any time from your account.",
          "Request deletion of your account and associated personal data.",
          "Withdraw consent to processing and control what you publish, including removing listings.",
          "Object to or restrict certain processing, and request information about how your data is handled.",
          "Change your interface language at any time; the choice is stored on your device."
        ]
      },
      {
        heading: "10. Children",
        paragraphs: [
          "Roomi is intended for users aged 18 and over. We do not knowingly collect personal data from anyone under 18; if we learn that we have, we will delete it."
        ]
      },
      {
        heading: "11. Changes and contact",
        paragraphs: [
          "We may update this Policy as the Platform evolves; material changes will be reflected by the “Last updated” date above. For any privacy question, to exercise your rights, or to request data deletion, contact us through the Support page."
        ]
      }
    ]
  },
  ru: {
    title: "Политика конфиденциальности",
    updated: "июль 2026 г.",
    updatedLabel: "Последнее обновление",
    intro:
      "Настоящая Политика конфиденциальности описывает, какие персональные данные собирает Roomi, для чего они используются и какие у вас есть права. Roomi выступает оператором ваших персональных данных и обрабатывает их в соответствии с Законом Республики Казахстан от 21 мая 2013 года № 94-V «О персональных данных и их защите». Мы стремимся собирать только те данные, которые необходимы для работы Платформы и безопасного поиска жилья или соседа.",
    sections: [
      {
        heading: "1. Какие данные мы собираем",
        list: [
          "Данные аккаунта: адрес электронной почты и данные для входа (включая данные входа через Google, если вы им пользуетесь).",
          "Данные профиля, которые вы указываете сами: имя, возраст, пол, университет, бюджет, образ жизни, описание и фотографии.",
          "Данные объявлений: сведения о жилье, местоположение, цена и публикуемые изображения.",
          "Данные об использовании: отправленные сообщения, просмотренные и избранные объявления, поданные жалобы.",
          "Технические данные: базовая информация об устройстве и журналы, необходимые для работы и защиты сервиса."
        ]
      },
      {
        heading: "2. Как мы используем данные",
        list: [
          "Для создания аккаунта и показа вашего профиля или объявлений другим пользователям.",
          "Для подбора совместимых соседей и подходящих комнат.",
          "Для обмена сообщениями между пользователями.",
          "Для модерации контента, рассмотрения жалоб и обеспечения безопасности сообщества.",
          "Для поддержки, защиты и совершенствования Платформы."
        ]
      },
      {
        heading: "3. Что видят другие пользователи",
        paragraphs: [
          "Ваш профиль и публикуемые вами объявления видны другим пользователям — без этого подбор невозможен. Не указывайте в публичном профиле сведения, которыми не готовы делиться. Ваш адрес электронной почты и пароль другим пользователям никогда не показываются."
        ]
      },
      {
        heading: "4. Хранение и обработка",
        paragraphs: [
          "Данные хранятся с использованием сервиса Supabase (аутентификация, база данных и файловое хранилище). Мы применяем контроль доступа, чтобы приватные данные — например, ваши сообщения и данные аккаунта — не были общедоступными. Ни один онлайн-сервис не может гарантировать абсолютную безопасность, поэтому используйте надёжный уникальный пароль."
        ]
      },
      {
        heading: "5. Правовые основания и согласие",
        paragraphs: [
          "Мы обрабатываем ваши персональные данные на основании вашего согласия (которое вы даёте при создании аккаунта и публикации профиля или объявления), для предоставления вам сервиса, для исполнения требований законодательства, а также в силу нашего законного интереса в обеспечении безопасности Платформы. Вы можете отозвать согласие в любой момент, отредактировав профиль или удалив аккаунт; это может ограничить функции, использующие соответствующие данные."
        ]
      },
      {
        heading: "6. Файлы cookie и локальное хранилище",
        paragraphs: [
          "Roomi использует строго необходимые файлы cookie и локальное хранилище браузера, чтобы поддерживать вашу авторизацию, запоминать выбранный язык и последние фильтры поиска. Если включена аналитика, могут собираться агрегированные обезличенные статистические данные для улучшения сервиса. Вы можете удалить эти данные в настройках браузера в любой момент."
        ]
      },
      {
        heading: "7. Передача данных",
        paragraphs: [
          "Мы не продаём ваши персональные данные. Данные передаются только поставщикам услуг, обеспечивающим работу Платформы (в частности, Supabase — провайдеру аутентификации, базы данных и файлового хранилища), при соблюдении обязательств о конфиденциальности, а также в случаях, предусмотренных законодательством Республики Казахстан, или по законному запросу уполномоченного органа."
        ]
      },
      {
        heading: "8. Сроки хранения",
        paragraphs: [
          "Мы храним ваши персональные данные, пока ваш аккаунт активен. После удаления аккаунта мы удаляем или обезличиваем персональные данные в разумный срок, за исключением случаев, когда их хранение необходимо для соблюдения законодательства Республики Казахстан, разрешения споров или предотвращения мошенничества и злоупотреблений."
        ]
      },
      {
        heading: "9. Ваши права",
        paragraphs: ["В соответствии с законодательством Республики Казахстан о персональных данных вы вправе:"],
        list: [
          "Получать доступ к своим персональным данным и исправлять их — просматривать и редактировать в любой момент в своём аккаунте.",
          "Требовать удаления аккаунта и связанных с ним персональных данных.",
          "Отзывать согласие на обработку и управлять публикуемым контентом, включая удаление объявлений.",
          "Возражать против отдельных видов обработки, требовать её ограничения и запрашивать сведения о порядке обработки ваших данных.",
          "Менять язык интерфейса в любой момент; выбор сохраняется на вашем устройстве."
        ]
      },
      {
        heading: "10. Дети",
        paragraphs: [
          "Roomi предназначен для пользователей старше 18 лет. Мы сознательно не собираем персональные данные лиц, не достигших 18 лет; если нам станет известно о таких данных, мы их удалим."
        ]
      },
      {
        heading: "11. Изменения и контакты",
        paragraphs: [
          "Мы можем обновлять настоящую Политику по мере развития Платформы; существенные изменения отражаются в дате «Последнее обновление» выше. По любым вопросам конфиденциальности, для реализации своих прав или запроса на удаление данных обращайтесь к нам через страницу поддержки."
        ]
      }
    ]
  },
  kz: {
    title: "Құпиялылық саясаты",
    updated: "2026 жылғы шілде",
    updatedLabel: "Соңғы жаңартылған күні",
    intro:
      "Осы Құпиялылық саясаты Roomi қандай дербес деректерді жинайтынын, оларды не үшін пайдаланатынын және сізде қандай құқықтар бар екенін түсіндіреді. Roomi сіздің дербес деректеріңіздің операторы ретінде әрекет етеді және оларды «Дербес деректер және оларды қорғау туралы» 2013 жылғы 21 мамырдағы № 94-V Қазақстан Республикасының Заңына сәйкес өңдейді. Біз Платформаның жұмысына және баспана не көрші іздеуді қауіпсіз етуге қажетті деректерді ғана жинауға тырысамыз.",
    sections: [
      {
        heading: "1. Біз жинайтын деректер",
        list: [
          "Аккаунт деректері: электрондық пошта мекенжайыңыз және кіру деректері (Google арқылы кірсеңіз — соған қатысты деректер де).",
          "Өзіңіз көрсететін профиль деректері: аты-жөні, жасы, жынысы, университеті, бюджеті, өмір салты, сипаттамасы және фотосуреттер.",
          "Хабарландыру деректері: тұрғын үй туралы мәліметтер, орналасқан жері, бағасы және жарияланатын суреттер.",
          "Пайдалану деректері: жіберілген хабарламалар, қаралған және таңдаулыға қосылған хабарландырулар, жіберілген шағымдар.",
          "Техникалық деректер: қызметтің жұмысы мен қауіпсіздігіне қажетті құрылғы туралы негізгі ақпарат және журналдар."
        ]
      },
      {
        heading: "2. Деректерді қалай пайдаланамыз",
        list: [
          "Аккаунт ашу және профиліңіз бен хабарландыруларыңызды басқа пайдаланушыларға көрсету үшін.",
          "Үйлесімді көршілер мен лайықты бөлмелерді іріктеу үшін.",
          "Пайдаланушылар арасында хабар алмасуды қамтамасыз ету үшін.",
          "Контентті модерациялау, шағымдарды қарау және қауымдастық қауіпсіздігін сақтау үшін.",
          "Платформаны қолдау, қорғау және жетілдіру үшін."
        ]
      },
      {
        heading: "3. Басқа пайдаланушылар нені көреді",
        paragraphs: [
          "Профиліңіз бен жариялаған хабарландыруларыңыз басқа пайдаланушыларға көрінеді — онсыз іріктеу мүмкін емес. Жария профиліңізге бөліскіңіз келмейтін ақпаратты жазбаңыз. Электрондық поштаңыз бен құпиясөзіңіз басқа пайдаланушыларға ешқашан көрсетілмейді."
        ]
      },
      {
        heading: "4. Сақтау және өңдеу",
        paragraphs: [
          "Деректер Supabase сервисі арқылы сақталады (аутентификация, дерекқор және файл қоймасы). Хабарламаларыңыз бен аккаунт деректері сияқты жеке деректердің жалпыға қолжетімді болмауы үшін қолжетімділікті бақылау қолданылады. Ешбір онлайн-сервис абсолютті қауіпсіздікке кепілдік бере алмайды, сондықтан күшті әрі қайталанбас құпиясөз қолданыңыз."
        ]
      },
      {
        heading: "5. Құқықтық негіздер және келісім",
        paragraphs: [
          "Дербес деректеріңізді сіздің келісіміңіз негізінде (аккаунт ашқанда және профиль не хабарландыру жариялағанда берілетін), сізге қызмет көрсету және заң талаптарын орындау үшін, сондай-ақ Платформаның қауіпсіздігін қамтамасыз етудегі заңды мүддеміз негізінде өңдейміз. Келісіміңізді кез келген уақытта профильді өзгерту немесе аккаунтты жою арқылы кері қайтарып ала аласыз; бұл сол деректерге сүйенетін функцияларды шектеуі мүмкін."
        ]
      },
      {
        heading: "6. Cookie файлдары және жергілікті қойма",
        paragraphs: [
          "Roomi жүйеге кіргеніңізді сақтау, таңдаған тіліңіз бен соңғы іздеу сүзгілерін есте сақтау үшін қатаң қажетті cookie файлдары мен браузердің жергілікті қоймасын пайдаланады. Аналитика қосылған болса, қызметті жақсарту үшін жинақталған, тұлғаны сәйкестендірмейтін статистика жиналуы мүмкін. Бұл деректерді браузер баптаулары арқылы кез келген уақытта өшіре аласыз."
        ]
      },
      {
        heading: "7. Деректерді беру",
        paragraphs: [
          "Біз дербес деректеріңізді сатпаймыз. Деректер тек Платформаның жұмысын қамтамасыз ететін қызмет жеткізушілерге (атап айтқанда, аутентификация, дерекқор және файл қоймасы провайдері Supabase-ке) құпиялылық міндеттемелері сақтала отырып беріледі, сондай-ақ Қазақстан Республикасының заңнамасында көзделген жағдайларда немесе уәкілетті органның заңды сұрауы бойынша ұсынылуы мүмкін."
        ]
      },
      {
        heading: "8. Деректерді сақтау мерзімі",
        paragraphs: [
          "Дербес деректеріңіз аккаунтыңыз белсенді болған кезде сақталады. Аккаунт жойылғаннан кейін біз дербес деректерді ақылға қонымды мерзімде жоямыз немесе иесіздендіреміз; Қазақстан Республикасының заңнамасын сақтау, дауларды шешу немесе алаяқтық пен теріс пайдаланудың алдын алу үшін сақтау қажет болатын жағдайлар бұған кірмейді."
        ]
      },
      {
        heading: "9. Сіздің құқықтарыңыз",
        paragraphs: ["Қазақстан Республикасының дербес деректер туралы заңнамасына сәйкес сіз мыналарға құқылысыз:"],
        list: [
          "Өз дербес деректеріңізге қол жеткізу және оларды түзету — аккаунтыңызда кез келген уақытта қарап, өзгерте аласыз.",
          "Аккаунтты және онымен байланысты дербес деректерді жоюды талап ету.",
          "Өңдеуге берген келісімді кері қайтарып алу және жариялайтын контентіңізді, соның ішінде хабарландыруларды жоюды басқару.",
          "Жекелеген өңдеу түрлеріне қарсылық білдіру, оны шектеуді талап ету және деректеріңіздің қалай өңделетіні туралы ақпарат сұрату.",
          "Интерфейс тілін кез келген уақытта өзгерту; таңдауыңыз құрылғыңызда сақталады."
        ]
      },
      {
        heading: "10. Балалар",
        paragraphs: [
          "Roomi 18 жастан асқан пайдаланушыларға арналған. Біз 18 жасқа толмаған адамдардың дербес деректерін әдейі жинамаймыз; мұндай деректер анықталса, оларды жоямыз."
        ]
      },
      {
        heading: "11. Өзгерістер және байланыс",
        paragraphs: [
          "Платформа дамыған сайын осы Саясат жаңартылуы мүмкін; елеулі өзгерістер жоғарыдағы «Соңғы жаңартылған күні» жолында көрсетіледі. Құпиялылыққа қатысты кез келген сұрақ бойынша, құқықтарыңызды іске асыру немесе деректерді жоюды сұрату үшін бізге Қолдау беті арқылы хабарласыңыз."
        ]
      }
    ]
  }
};

export function PrivacyContent() {
  const { locale } = useLocale();
  return <LegalPage {...CONTENT[locale]} />;
}
