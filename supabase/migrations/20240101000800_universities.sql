-- Comprehensive Kazakhstani university directory seed.
-- Run this once in the Supabase SQL editor, after the earlier migrations.
-- Safe to re-run (idempotent).
--
-- listings.university / profiles.university are FREE TEXT (no foreign key), so
-- adding/removing rows here never breaks existing listings or profiles.

-- 1. Remove the earlier small auto-seed (from supabase-migration-phase2.sql),
--    but ONLY rows the admin hasn't enriched (no logo/cover/description), so any
--    manual customization is preserved. Old-naming slugs that are superseded by
--    the richer names below would otherwise appear as duplicates.
delete from public.universities
where slug in (
  'al-farabi-kazakh-national-university','kbtu','sdu-university','satbayev-university',
  'kimep-university','narxoz-university','kazakh-ablai-khan-university-of-international-relations-and-world-languages',
  'kazakh-national-pedagogical-university-named-after-abai','kazakh-national-medical-university','turan-university',
  'international-it-university','kazakh-national-agrarian-research-university','nazarbayev-university',
  'l-n-gumilyov-eurasian-national-university','astana-it-university','s-seifullin-kazakh-agrotechnical-university',
  'astana-medical-university','m-auezov-south-kazakhstan-university','karaganda-buketov-university',
  'karaganda-technical-university','k-zhubanov-aktobe-regional-university','m-kh-dulaty-taraz-regional-university',
  's-toraighyrov-pavlodar-state-university','shakarim-university-semey','d-serikbayev-east-kazakhstan-technical-university',
  'a-baitursynov-kostanay-regional-university','atyrau-university','m-utemisov-west-kazakhstan-university',
  'm-kozybayev-north-kazakhstan-university'
)
  and coalesce(logo_url, '') = ''
  and coalesce(cover_image_url, '') = ''
  and coalesce(description, '') = '';

-- 2. Insert the comprehensive list. Slug is computed the same way the app's
--    slugify() helper does, so admin edits and re-runs stay consistent.
insert into public.universities (name, slug, city, position, active, featured, featured_position)
select
  d.name,
  trim(both '-' from regexp_replace(lower(d.name), '[^a-z0-9]+', '-', 'g')),
  d.city,
  d.position,
  true,
  d.featured,
  case when d.featured then d.featured_position else null end
from (values
  ('Al-Farabi Kazakh National University', 'Almaty', 0, true, 0),
  ('Kazakh-British Technical University (KBTU)', 'Almaty', 1, true, 1),
  ('SDU University (Suleyman Demirel)', 'Almaty', 2, true, 4),
  ('Satbayev University', 'Almaty', 3, false, 0),
  ('KIMEP University', 'Almaty', 4, true, 5),
  ('Narxoz University', 'Almaty', 5, false, 0),
  ('Almaty Management University (AlmaU)', 'Almaty', 6, false, 0),
  ('International IT University (IITU)', 'Almaty', 7, false, 0),
  ('Kazakh Ablai Khan University of International Relations and World Languages', 'Almaty', 8, false, 0),
  ('Abai Kazakh National Pedagogical University', 'Almaty', 9, false, 0),
  ('Kazakh National Medical University (Asfendiyarov)', 'Almaty', 10, false, 0),
  ('Turan University', 'Almaty', 11, false, 0),
  ('Kazakh National Agrarian Research University', 'Almaty', 12, false, 0),
  ('University of International Business (UIB)', 'Almaty', 13, false, 0),
  ('Almaty Technological University', 'Almaty', 14, false, 0),
  ('T. Zhurgenov Kazakh National Academy of Arts', 'Almaty', 15, false, 0),
  ('Kurmangazy Kazakh National Conservatory', 'Almaty', 16, false, 0),
  ('Kazakh National Women''s Teacher Training University', 'Almaty', 17, false, 0),
  ('Nazarbayev University', 'Astana', 18, true, 2),
  ('L.N. Gumilyov Eurasian National University', 'Astana', 19, true, 3),
  ('Maqsut Narikbayev University (KAZGUU)', 'Astana', 20, false, 0),
  ('Astana IT University', 'Astana', 21, false, 0),
  ('S. Seifullin Kazakh Agrotechnical University', 'Astana', 22, false, 0),
  ('Astana Medical University', 'Astana', 23, false, 0),
  ('Kazakh University of Economics, Finance and International Trade', 'Astana', 24, false, 0),
  ('Eurasian Humanities Institute', 'Astana', 25, false, 0),
  ('Astana International University', 'Astana', 26, false, 0),
  ('M. Auezov South Kazakhstan University', 'Shymkent', 27, false, 0),
  ('South Kazakhstan Medical Academy', 'Shymkent', 28, false, 0),
  ('Ozbekali Zhanibekov South Kazakhstan Pedagogical University', 'Shymkent', 29, false, 0),
  ('Shymkent University', 'Shymkent', 30, false, 0),
  ('University of Miras', 'Shymkent', 31, false, 0),
  ('Karaganda Buketov University', 'Karaganda', 32, false, 0),
  ('Abylkas Saginov Karaganda Technical University', 'Karaganda', 33, false, 0),
  ('Karaganda Medical University', 'Karaganda', 34, false, 0),
  ('Karaganda University of Kazpotrebsoyuz', 'Karaganda', 35, false, 0),
  ('K. Zhubanov Aktobe Regional University', 'Aktobe', 36, false, 0),
  ('West Kazakhstan Marat Ospanov Medical University', 'Aktobe', 37, false, 0),
  ('M.Kh. Dulaty Taraz Regional University', 'Taraz', 38, false, 0),
  ('Taraz Innovative-Humanitarian University', 'Taraz', 39, false, 0),
  ('Kh. Dosmukhamedov Atyrau University', 'Atyrau', 40, false, 0),
  ('Safi Utebayev Atyrau Oil and Gas University', 'Atyrau', 41, false, 0),
  ('Toraighyrov University', 'Pavlodar', 42, false, 0),
  ('Pavlodar Pedagogical University', 'Pavlodar', 43, false, 0),
  ('Shakarim University of Semey', 'Semey', 44, false, 0),
  ('Semey Medical University', 'Semey', 45, false, 0),
  ('D. Serikbayev East Kazakhstan Technical University', 'Oskemen', 46, false, 0),
  ('Sarsen Amanzholov East Kazakhstan University', 'Oskemen', 47, false, 0),
  ('A. Baitursynov Kostanay Regional University', 'Kostanay', 48, false, 0),
  ('Kostanay Social-Technical University', 'Kostanay', 49, false, 0),
  ('Sh. Ualikhanov Kokshetau University', 'Kokshetau', 50, false, 0),
  ('Abai Myrzakhmetov Kokshetau University', 'Kokshetau', 51, false, 0),
  ('M. Kozybayev North Kazakhstan University', 'Petropavlovsk', 52, false, 0),
  ('Khoja Akhmet Yassawi International Kazakh-Turkish University', 'Turkistan', 53, false, 0),
  ('M. Utemisov West Kazakhstan University', 'Oral', 54, false, 0),
  ('Zhangir Khan West Kazakhstan Agrarian-Technical University', 'Oral', 55, false, 0),
  ('Korkyt Ata Kyzylorda University', 'Kyzylorda', 56, false, 0),
  ('Ilyas Zhansugurov Zhetysu University', 'Taldykorgan', 57, false, 0)
) as d(name, city, position, featured, featured_position)
on conflict (slug) do nothing;
