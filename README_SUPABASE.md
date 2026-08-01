# Roomi — Self-Hosted Supabase Setup

Roomi runs against a **self-hosted Supabase** (Docker Compose) on the VPS, not a
`supabase.co` cloud project. The API gateway (Kong) fronts Auth, PostgREST,
Storage and Realtime at:

```
https://api.roomi.kz
```

Configuration lives in **`supabase/docker/.env` on the server** — there is no
hosted dashboard to click through. After changing that file you must restart the
affected services:

```bash
cd ~/supabase/docker
docker compose up -d          # re-creates containers with the new env
```

## Application environment

The Next.js app reads these (see `.env.example` for the full list):

```env
NEXT_PUBLIC_SITE_URL=https://roomi.kz
NEXT_PUBLIC_SUPABASE_URL=https://api.roomi.kz
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from supabase/docker/.env>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from supabase/docker/.env>
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=roommate-assets
ADMIN_EMAILS=you@example.com
```

`NEXT_PUBLIC_SUPABASE_URL` is required at **build time** as well as runtime: it is
baked into the Content-Security-Policy and `next/image`'s remote allow-list in
`next.config.ts`. If it is wrong or missing at build time, the browser will block
every Supabase request and uploaded images will not render.

`SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` are **runtime server** secrets.
The deploy workflow writes them into `~/app/roomi/.env.production` (mode 0600) on
the VPS and passes them to the container with `--env-file`. Without the service
role key, image uploads, the admin panel, moderation and terms-acceptance fail.

## Auth configuration (`supabase/docker/.env`)

Google sign-in round-trips through `/api/auth/callback`, which exchanges the
`code` for a session and then forwards on. Password recovery does **not** use
that route — see the next section.

```env
SITE_URL=https://roomi.kz
ADDITIONAL_REDIRECT_URLS=https://roomi.kz/**
API_EXTERNAL_URL=https://api.roomi.kz
```

`SITE_URL` is what the recovery email template builds its link from, so it must
be exactly `https://roomi.kz` — no trailing slash, no port, not an IP.

`ADDITIONAL_REDIRECT_URLS` must cover every callback the app uses. The wildcard
`https://roomi.kz/**` already covers `/api/auth/callback` and `/reset-password`.
Add `http://localhost:3000/**` only if you also develop against this instance.

### Password recovery — REQUIRED template change

Recovery offers the user two ways in, and both come from **one** email:

| Method | Credential | Redeemed by |
| --- | --- | --- |
| Open the link | `{{ .TokenHash }}` | `verifyOtp({ token_hash, type: "recovery" })` |
| Type the code | `{{ .Token }}` (6 digits) | `verifyOtp({ email, token, type: "recovery" })` |

Both are POSTs to `/auth/v1/verify`, and neither is tied to a browser. That is
the point: the stock `{{ .ConfirmationURL }}` template sends users through
GoTrue's own `/auth/v1/verify` **on a GET**, which

- lets any mail-scanning proxy that prefetches links (Outlook Safe Links,
  corporate gateways) burn the single-use token before the user ever clicks, and
- hands the session back in a URL *fragment*, which is dropped by server-side
  redirects and by in-app webviews.

Both failures reach the user as "this link is invalid or has expired" — for a
link that was perfectly valid.

**The 6-digit code does not appear in the email at all until the template is
changed**, because the stock template never references `{{ .Token }}`.

Install [`supabase/templates/recovery.html`](supabase/templates/recovery.html)
on the server, mount it into the auth container, and point GoTrue at it:

```bash
# on the VPS
mkdir -p ~/supabase/docker/volumes/auth/templates
# copy supabase/templates/recovery.html from this repo to:
#   ~/supabase/docker/volumes/auth/templates/recovery.html
```

In `supabase/docker/docker-compose.yml`, give the `auth` service the mount:

```yaml
  auth:
    volumes:
      - ./volumes/auth/templates:/etc/gotrue/templates:ro
```

Then in `supabase/docker/.env`:

```env
MAILER_TEMPLATES_RECOVERY=/etc/gotrue/templates/recovery.html
MAILER_SUBJECTS_RECOVERY=Reset your Roomi password
```

Apply with `docker compose up -d auth`.

Verify by requesting a reset and reading the **received** email — not the
template file. It must contain both a `…/reset-password?token_hash=…` link and a
6-digit number. If the number is missing, GoTrue is still serving the stock
template and only the link method will work.

The app keeps accepting the older `#access_token=…` and `?code=…` link shapes,
so recovery emails already sitting in inboxes are not invalidated by this
change.

> The code length is GoTrue's documented 6 digits. If you ever change it,
> update `RECOVERY_CODE_LENGTH` in `src/lib/supabase/recovery.ts` to match —
> the reset form validates against it before calling the API.

### Email delivery — REQUIRED for registration

With `ENABLE_EMAIL_AUTOCONFIRM=false`, users must confirm their address before
they can sign in, so **a working SMTP relay is mandatory**. The stock values
(`SMTP_HOST=supabase-mail`, `fake_mail_user`, …) are placeholders and do not
deliver mail — leaving them means new users can never complete registration and
password reset silently fails.

Set real credentials (SendGrid, Resend, Mailgun, Amazon SES, …):

```env
SMTP_ADMIN_EMAIL=no-reply@roomi.kz
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
SMTP_SENDER_NAME=Roomi
```

The app surfaces delivery failures as "We couldn't send the email. Email delivery
may not be configured yet."

Alternative for a soft launch: set `ENABLE_EMAIL_AUTOCONFIRM=true` so accounts are
usable immediately. This skips address verification entirely — acceptable only as
a temporary measure, and password reset still needs SMTP.

### Google sign-in — must be enabled explicitly

The sign-in screen offers "Continue with Google". On a self-hosted instance the
provider is **disabled by default**; the button fails until you enable it in
`supabase/docker/.env` *and* uncomment the matching `GOTRUE_EXTERNAL_GOOGLE_*`
lines in `supabase/docker/docker-compose.yml`:

```env
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_SECRET=<from Google Cloud Console>
```

In Google Cloud Console, add this authorized redirect URI:

```
https://api.roomi.kz/auth/v1/callback
```

## Storage

Uploads go through `POST /api/upload`, which verifies the file's real magic bytes
server-side and writes with the service-role client. The bucket named by
`NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (default `roommate-assets`) must exist and
be **public**, since images are served via `getPublicUrl()`:

```
https://api.roomi.kz/storage/v1/object/public/roommate-assets/<path>
```

## Realtime

Chat subscribes to `postgres_changes` on `messages` and `conversations`. The
publication membership is applied by
`supabase/migrations/20240101001600_realtime.sql`. The reverse proxy in front of
`api.roomi.kz` must forward WebSocket upgrade headers, or the client silently
falls back to polling.

## Database migrations

Versioned SQL lives in `supabase/migrations/` and is applied with the Supabase
CLI (`supabase db push`) — see `supabase/migrations/README.md`. Do not hand-edit
production schema; add a new timestamped migration instead.

```env
# Optional: point address autocomplete at a paid/self-hosted geocoder for
# production scale (defaults to the rate-limited public Nominatim endpoint).
NEXT_PUBLIC_GEOCODER_URL=https://nominatim.openstreetmap.org
```
