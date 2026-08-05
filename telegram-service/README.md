# Roomi Telegram Import Service

Monitors configured Telegram channels/groups, extracts rental/roommate
listing data from new messages using Gemini, uploads any attached photos into
the existing Roomi Supabase storage bucket, and writes a draft row to
`telegram_listings` for review in **Admin Panel → Telegram Imports**. Nothing
here publishes directly — every import is reviewed, edited if needed, and
explicitly approved or rejected by an admin.

## Architecture

```
telegram-service/
├── app/
│   ├── config.py            # env loading/validation
│   ├── db.py                 # Supabase REST (service-role key)
│   ├── extraction.py          # Gemini call + Pydantic validation
│   ├── media.py                # Telegram photo download -> Storage upload
│   ├── telethon_client.py       # MTProto client construction/session reuse
│   ├── logging_config.py         # structured (JSON) logging
│   └── main.py                    # FastAPI app; runs the listener as a background task
├── scripts/create_session.py  # ONE-TIME interactive login (run locally)
├── telegram_listener.py       # listen_messages / extract_listing / download_media / create_draft_listing
├── tests/                      # pure-logic unit tests (validation, parsing)
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
# edit .env: TELEGRAM_API_ID, TELEGRAM_API_HASH, GEMINI_API_KEY,
# NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

`GET http://localhost:8000/health` returns `{"server": "ok", "listener": "running"}`.

## Docker

```bash
docker build -t roomi-telegram-service .
docker run -d --name roomi-telegram \
  --env-file .env \
  -v roomi-telegram-session:/app/data \
  -p 127.0.0.1:8000:8000 \
  roomi-telegram-service
```

The named volume persists the session file across container recreation. Copy
your locally-created `roomi_session.session` into that volume once (or run
`create_session.py` once with the volume mounted) — the running container
itself must never attempt first-time login.

## Tests

```bash
pytest
```

Covers the pure logic only (price/field validation, JSON-fence stripping,
image magic-byte detection) — no live Telegram/Gemini/Supabase calls.
