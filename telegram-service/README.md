# Roomi Telegram Import Service

Monitors configured Telegram channels/groups, reads rental/roommate listing
data out of new messages with a **deterministic parser** (regex, keyword tables
and string handling — no model, no API key, no quota, no per-message cost),
uploads any attached photos into the existing Roomi Supabase storage bucket, and
writes a draft row to `telegram_listings` for review in **Admin Panel → Telegram
Imports**. Nothing here publishes directly — every import is reviewed, edited if
needed, and explicitly approved or rejected by an admin.

## The pipeline

```
Telegram message
    -> album reassembly       six events, one post (app/albums.py)
    -> spam filter            cheap gate, BEFORE the first database write
    -> deterministic parser   telegram_parser/
    -> photo processing       streamed, never buffered whole (app/media.py)
    -> telegram_listings      status='pending_review'
    -> admin review           Admin Panel -> Telegram Imports
    -> manual approval        the EXISTING createListing() pipeline
```

The spam filter's position is the load-bearing part: a message that is not about
housing costs one regex sweep and leaves no row, no photo download, no storage
object and nothing for an admin to dismiss.

## Architecture

```
telegram-service/
├── app/
│   ├── config.py             # env loading/validation
│   ├── db.py                  # Supabase REST (service-role key, ONE pooled client)
│   ├── albums.py               # reassembles multi-photo posts before parsing
│   ├── media.py                 # Telegram photo download -> Storage upload, streamed
│   ├── telethon_client.py        # MTProto client construction/session reuse
│   ├── logging_config.py          # structured (JSON) logging
│   └── main.py                     # FastAPI app; runs the listener as a background task
├── telegram_parser/           # THE PARSER — pure Python, zero dependencies
│   ├── patterns.py            #   every regex and keyword table
│   ├── extractors.py           #   one function per field, silent when unsure
│   ├── spam_filter.py           #   weighted-signal relevance gate
│   └── parser.py                 #   orchestration -> ParsedListing
├── scripts/create_session.py  # ONE-TIME interactive login (run locally)
├── telegram_listener.py       # listen_messages / process_group / download_media / create_draft_listing
├── tests/                      # pure-logic unit tests, driven by REAL production posts
├── requirements.txt
├── Dockerfile
├── .env.example
└── .env                        # you create this locally; NEVER committed
```

Approving an import in the admin panel does not duplicate any listing-creation
logic: it calls the exact same `createListing()` / `createTemporaryHost()`
functions the existing admin "paste a Telegram post" quick-create flow already
uses (`src/lib/data/listings-admin.ts`, `src/lib/data/seeded-hosts.ts`), so an
approved Telegram import is indistinguishable from a hand-seeded listing.

## Setup

```bash
cd telegram-service
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: TELEGRAM_API_ID, TELEGRAM_API_HASH,
# NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# (there is no AI key to configure — extraction is deterministic)
```

Requires **Python 3.10+** (uses `X | Y` union type syntax throughout).

## First run: interactive Telegram login (REQUIRED, one time)

MTProto login needs a real phone number, a live login code, and — if you have
two-step verification — your 2FA password. None of that can be supplied by an
automated process. Run this yourself, from a real terminal:

```bash
python scripts/create_session.py
```

You'll be prompted for your phone number, then the code Telegram sends you,
then your 2FA password if you have one set. On success it prints your account
name and writes `roomi_session.session` next to the script. **That file IS the
credential from then on** — treat it like a password: never commit it (already
gitignored), and copy it (don't regenerate it) to wherever the worker actually
runs.

After this one-time step, `telegram_listener.py` / the FastAPI app reuse the
session file silently — they never prompt for login again, and will raise a
clear startup error if the session is missing or was revoked, rather than
attempting to log in themselves.

## Configure sources

Sources are rows in `public.telegram_sources` (service-role only — not exposed
via the Roomi UI in this iteration; add them directly via SQL or a future
admin screen):

```sql
insert into public.telegram_sources (name, telegram_username, type, enabled)
values ('Rent Almaty Group', '@some_group', 'group', true);
```

`telegram_username` is anything Telethon's `get_entity()` accepts — a
`@username`, invite-link username, or numeric chat id as text. The account
used to create the session must already be a member of any private
group/channel you point this at.

## Running

```bash
# Local dev
uvicorn app.main:app --reload --port 8000

# Or the worker directly, without the HTTP wrapper
python telegram_listener.py
```

`GET http://localhost:8000/health` returns the server state plus the listener's
**real** Telegram connection state:

```json
{ "server": "ok", "listener": "connected", "listener_detail": null }
```

`listener` is one of:

| value | meaning |
|---|---|
| `connected` | authenticated and listening — the only healthy value |
| `starting` | process is up, first connection not established yet |
| `disconnected` | was connected, the client dropped; the supervisor will retry |
| `error` | last attempt failed; `listener_detail` carries the reason |

It reports connection state rather than "is the background task alive" on
purpose: the supervisor loop in `telegram_listener.run_forever()` is designed
never to die (catch → log → back off → retry), so task liveness is `true` even
while every connection attempt is failing for want of a session. Gating health
on that would have reported a healthy service with no Telegram session at all.

The endpoint returns HTTP 200 in every case, including `error` — a transient
state must not fail the container healthcheck and trigger a restart loop.

## Docker

```bash
docker build -t roomi-telegram-service .
docker run -d --name roomi-telegram \
  --env-file .env \
  -v roomi-telegram-session:/app/data \
  -p 127.0.0.1:8000:8000 \
  roomi-telegram-service
```

The named volume persists the session file across container recreation. The
running container must never attempt a first-time login — it has no TTY to type
a code into, and Telegram would rate-limit the retries.

### Installing the session on the production VPS

The session file is created **once, on your own machine** (`create_session.py`
prompts for the phone/code/2FA) and then copied to the server. It is never
committed, never put in a GitHub secret, and never baked into the image — it
grants full access to the Telegram account that created it.

```bash
# 1) On your machine — copy the session to the VPS (never `git add` it)
scp telegram-service/roomi_session.session <user>@<vps-host>:/tmp/roomi_session.session

# 2) On the VPS — install it into the named volume the container mounts
sudo install -d -m 700 /opt/roomi/telegram-session
sudo mv /tmp/roomi_session.session /opt/roomi/telegram-session/
sudo chmod 600 /opt/roomi/telegram-session/roomi_session.session

# copy it into the Docker volume the deploy workflow mounts at /app/data
docker run --rm \
  -v roomi-telegram-session:/data \
  -v /opt/roomi/telegram-session:/src:ro \
  alpine sh -c 'cp /src/roomi_session.session /data/ && chmod 600 /data/roomi_session.session'

# 3) Restart so the listener picks it up
docker restart roomi-telegram-service
curl -s http://127.0.0.1:8010/health
```

Step 3 should report `"listener": "connected"`. The container runs as a non-root
`telegram` user, so if it cannot read the file, check ownership inside the
volume.

Rotation: if the session is ever exposed, terminate it from
**Telegram → Settings → Devices → Active sessions**, then re-run
`create_session.py` and repeat the steps above. Revoking there invalidates the
file immediately.

## Tests

```bash
pytest
```

No live Telegram or Supabase calls: the parser is pure, so every test runs from
a string literal.

- `test_parser.py` — every extractor, driven by **verbatim posts** from the four
  channels this service watches. They are kept literal (emoji, typos, mixed
  Russian/Kazakh, inconsistent spacing) because each of those is something the
  parser has to survive.
- `test_spam_filter.py` — what must be dropped, and the thinnest real post that
  must not be.
- `test_pipeline.py` — album reassembly, the gate's position before the first
  write, sender capture, photo streaming and size limits.
- `test_retry.py` — the "transient failure requeues / permanent failure
  completes" rule.
- `test_db_errors.py`, `test_peer_routing.py` — Supabase error surface and the
  raw/marked chat-id mismatch.

## Tuning the parser

Behaviour is data, not control flow: adding a ЖК, a spam phrase or another way
of writing "50 thousand" is an edit to a table in `telegram_parser/patterns.py`
plus a test that pins it. Two things to know before editing a regex there:

1. **`\b` cannot terminate a token that ends in a non-word character.** `₸\b`
   never matches "150 000 ₸ +", because both sides of that position are
   non-word — this silently hid every tenge-symbol price, the most common format
   in these channels. Units end with `(?!\w)` instead.
2. **Cyrillic and Latin substrings collide across languages.** `деп\b` matches
   the last three letters of the Kazakh "іздеп" ("looking for"), and `р[- ]?н`
   matches the "рн" inside "орналасқан" ("located"). Both shipped, and both are
   now pinned by a named regression test.

Bump `PARSER_VERSION` when a rule changes what a post extracts to; it is stored
on every draft, so a field that looks wrong can be traced to the ruleset that
produced it.
