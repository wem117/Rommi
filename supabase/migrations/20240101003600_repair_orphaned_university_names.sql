-- Repairs listings filed under a university name the platform does not have.
--
-- The Telegram parser's alias table resolved SDU to "SDU University (Suleyman
-- Demirel)" — the spelling in the app's constants file — while the
-- `universities` table holds "SDU University". Nothing errored: `university` is
-- free text. But the site filters it with an exact string compare, so 21
-- imported listings were unreachable from the SDU hub card, and because their
-- `university` was non-empty they missed the "no university, right city"
-- fallback as well. They were live, correct, and invisible.
--
-- The alias table and the constants file were aligned to the database in the
-- same change, and tests/test_parser.py now fails the build if any alias ever
-- again resolves to a name the app does not have. This migration cleans up the
-- rows that were written before that guard existed.
--
-- Keyed on the exact bad strings rather than a fuzzy match: a LIKE '%SDU%'
-- would also catch any legitimate future university with those letters in its
-- name, and silently rewriting a correct row is worse than leaving a wrong one.

update public.listings as l set
  university = u.name,
  updated_at = now()
from (values
  ('SDU University (Suleyman Demirel)',                 'SDU University'),
  ('SDU',                                               'SDU University'),
  ('Kazakh-British Technical University (KBTU)',        'KBTU'),
  ('International IT University (IITU)',                'International IT University'),
  ('Kazakh National Medical University (Asfendiyarov)', 'Kazakh National Medical University'),
  ('Abai Kazakh National Pedagogical University',       'Kazakh National Pedagogical University named after Abai')
) as u(bad, name)
where l.university = u.bad;

-- Profiles store the same free text and are picked from the same combobox, so
-- they can carry the same stale spellings.
update public.profiles as p set
  university = u.name,
  updated_at = now()
from (values
  ('SDU University (Suleyman Demirel)',                 'SDU University'),
  ('SDU',                                               'SDU University'),
  ('Kazakh-British Technical University (KBTU)',        'KBTU'),
  ('International IT University (IITU)',                'International IT University'),
  ('Kazakh National Medical University (Asfendiyarov)', 'Kazakh National Medical University'),
  ('Abai Kazakh National Pedagogical University',       'Kazakh National Pedagogical University named after Abai')
) as u(bad, name)
where p.university = u.bad;
