-- Fills in the profile fields for the seventeen universities that carry the
-- platform's traffic, and moves Cardiff University Kazakhstan to 8th place.
--
-- The fields themselves were added in 20240101003300 and, until now, only
-- Cardiff had them populated — every other row rendered with a blank country,
-- no website, no type, and its Latin name in all three languages.
--
-- `name` is deliberately NOT touched anywhere in this file. It is the canonical
-- identifier: `listings.university` and `profiles.university` store it as free
-- text, the search filters compare it, `getUniversityCity()` maps it to a city,
-- and the Telegram parser resolves incoming posts to it. Renaming a row here
-- would orphan every listing and profile already pointing at the old string.
-- Where an institution's current legal name has drifted from the stored one
-- (KazATU is now an Agrotechnical *Research* University; KazNMU carries
-- "National" the site's own title omits), the accurate current form goes in
-- name_ru / name_kz, which are display-only.
--
-- Localised names were read off each university's own site where it publishes
-- them; the sites are the authority on their own name, and several differ from
-- what a transliteration would produce. Websites were probed live: kaznpu.kz
-- now redirects to abai.university, which is why the stored URL is the latter.
--
-- Idempotent: keyed on `slug`, safe to re-run, and it writes only the six
-- profile columns plus logo_url. It does not touch `active`, `featured`,
-- `image_url` or the count overrides — those are the admin panel's.

update public.universities as u set
  name_ru  = v.name_ru,
  name_kz  = v.name_kz,
  country  = 'Kazakhstan',
  type     = v.type,
  website  = v.website,
  language = v.language,
  -- Only fills a gap, never replaces an admin upload.
  logo_url = coalesce(u.logo_url, nullif(v.logo_url, '')),
  updated_at = now()
from (values
  ('al-farabi-kazakh-national-university',
   'Казахский национальный университет имени аль-Фараби',
   'Әл-Фараби атындағы Қазақ ұлттық университеті',
   'National research university', 'https://www.kaznu.kz/', 'Kazakh, Russian, English', ''),

  ('kbtu',
   'Казахстанско-Британский технический университет',
   'Қазақстан-Британ техникалық университеті',
   'Private university', 'https://kbtu.edu.kz/', 'English',
   '/universities/kbtu-logo.png'),

  ('sdu-university',
   'SDU University',
   'SDU University',
   'Private university', 'https://sdu.edu.kz/', 'English',
   '/universities/sdu-university-logo.png'),

  ('satbayev-university',
   'Казахский национальный исследовательский технический университет имени К. И. Сатпаева',
   'Қ. И. Сәтбаев атындағы Қазақ ұлттық техникалық зерттеу университеті',
   'National research university', 'https://satbayev.university/', 'Kazakh, Russian, English',
   '/universities/satbayev-university-logo.png'),

  ('kimep-university',
   'КИМЭП Университет',
   'КИМЭП Университеті',
   'Private university', 'https://www.kimep.kz/', 'English', ''),

  ('narxoz-university',
   'Университет Нархоз',
   'Нархоз Университеті',
   'Private university', 'https://narxoz.edu.kz/', 'Kazakh, Russian, English', ''),

  ('kazakh-ablai-khan-university-of-international-relations-and-world-languages',
   'Казахский университет международных отношений и мировых языков имени Абылай хана',
   'Абылай хан атындағы Қазақ халықаралық қатынастар және әлем тілдері университеті',
   'Public university', 'https://www.ablaikhan.kz/', 'Kazakh, Russian, English', ''),

  ('nazarbayev-university',
   'Назарбаев Университет',
   'Назарбаев Университеті',
   'Autonomous research university', 'https://nu.edu.kz/', 'English',
   '/universities/nazarbayev-university-logo.png'),

  ('kazakh-national-pedagogical-university-named-after-abai',
   'Казахский национальный педагогический университет имени Абая',
   'Абай атындағы Қазақ ұлттық педагогикалық университеті',
   'National university', 'https://abai.university/', 'Kazakh, Russian',
   '/universities/kazakh-national-pedagogical-university-named-after-abai-logo.png'),

  ('kazakh-national-medical-university',
   'Казахский национальный медицинский университет имени С. Д. Асфендиярова',
   'С. Ж. Асфендияров атындағы Қазақ ұлттық медицина университеті',
   'National university', 'https://kaznmu.edu.kz/', 'Kazakh, Russian, English',
   '/universities/kazakh-national-medical-university-logo.png'),

  ('l-n-gumilyov-eurasian-national-university',
   'Евразийский национальный университет имени Л. Н. Гумилёва',
   'Л. Н. Гумилев атындағы Еуразия ұлттық университеті',
   'National research university', 'https://enu.kz/', 'Kazakh, Russian, English', ''),

  ('astana-it-university',
   'Astana IT University',
   'Astana IT University',
   'Private university', 'https://astanait.edu.kz/', 'English',
   '/universities/astana-it-university-logo.png'),

  ('turan-university',
   'Университет «Туран»',
   '«Тұран» университеті',
   'Private university', 'https://www.turan-edu.kz/', 'Kazakh, Russian, English', ''),

  ('international-it-university',
   'Международный университет информационных технологий',
   'Халықаралық ақпараттық технологиялар университеті',
   'Private university', 'https://iitu.edu.kz/', 'Kazakh, Russian, English',
   '/universities/international-it-university-logo.png'),

  ('kazakh-national-agrarian-research-university',
   'Казахский национальный аграрный исследовательский университет',
   'Қазақ ұлттық аграрлық зерттеу университеті',
   'National research university', 'https://kaznaru.edu.kz/', 'Kazakh, Russian, English',
   '/universities/kazakh-national-agrarian-research-university-logo.png'),

  ('s-seifullin-kazakh-agrotechnical-university',
   'Казахский агротехнический исследовательский университет имени С. Сейфуллина',
   'С. Сейфуллин атындағы Қазақ агротехникалық зерттеу университеті',
   'Public university', 'https://kazatu.edu.kz/', 'Kazakh, Russian',
   '/universities/s-seifullin-kazakh-agrotechnical-university-logo.png'),

  ('astana-medical-university',
   'Медицинский университет Астана',
   'Астана медицина университеті',
   'Public university', 'https://amu.edu.kz/', 'Kazakh, Russian, English', '')
) as v(slug, name_ru, name_kz, type, website, language, logo_url)
where u.slug = v.slug;


-- Cardiff to 8th place: after Ablai Khan, before Nazarbayev.
--
-- `position` is 0-based and orders the public list ascending, so 8th place is
-- position 7. Everything from Nazarbayev down shifts one slot later.
--
-- Guarded so a re-run cannot shift the list a second time. Without this, every
-- redeploy would push ten universities one place further down the page.
do $$
declare
  target constant int := 7;
  current_pos int;
begin
  select position into current_pos
  from public.universities where slug = 'cardiff-university-kazakhstan';

  if current_pos is null or current_pos = target then
    return;
  end if;

  -- Open the slot, then drop Cardiff into it. Two statements rather than one
  -- because `position` has no unique constraint to defer around, and doing it
  -- in this order never leaves a gap in the visible ordering.
  update public.universities
     set position = position + 1, updated_at = now()
   where position >= target
     and slug <> 'cardiff-university-kazakhstan';

  update public.universities
     set position = target, updated_at = now()
   where slug = 'cardiff-university-kazakhstan';
end $$;

notify pgrst, 'reload schema';
