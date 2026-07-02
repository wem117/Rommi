# Roommate KZ Supabase Setup

## Environment

Create or update `.env.local` with placeholders like these:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
<<<<<<< HEAD
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=roommate-assets
NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO=http://localhost:3000
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
```

Use the Supabase project API URL for both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`. Do not use the dashboard URL.

## What Each Credential Does

- `NEXT_PUBLIC_SUPABASE_URL`: public project API URL used by browser and server helpers.
- `SUPABASE_URL`: server-side alias for admin and upload helpers.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public anon key for browser auth, reads, and signed-in client requests.
- `SUPABASE_SERVICE_ROLE_KEY`: private server-only key for admin APIs and trusted uploads. Never expose it in browser code.
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`: storage bucket for avatar, listing, and chat uploads.
- `NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO`: local or deployed redirect target for Google OAuth.
- `NEXT_PUBLIC_SUPPORT_EMAIL`: support contact used in UI/help surfaces.

## Quick Setup

1. Paste the environment values into `.env.local`.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Create a public storage bucket named `roommate-assets`, or change `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`.
4. Run `supabase-policies.sql` in the Supabase SQL editor.
5. In Supabase Auth, keep Google OAuth and email/password enabled. Do not enable phone/SMS auth.
6. Add `http://localhost:3000` to the allowed redirect URLs for local development.
7. Restart the dev server after any `.env.local` change.

## Image Upload Notes

- Uploads should go through the app server, not directly from the browser.
- The server validates the signed-in session, uploads using trusted credentials, then inserts an `images` row with `owner_id`.
- RLS errors usually mean the client inserted metadata without `owner_id = auth.uid()` or the policy is missing.
=======
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=roommate-assets
NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
```

## What each credential does

- `NEXT_PUBLIC_SUPABASE_URL`: browser and server project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser auth, reads, and signed-in client requests.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only admin key for `/api/upload`, admin APIs, and protected email lookup.
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`: storage bucket for listing and avatar uploads.
- `NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO`: OAuth callback URL, for example `http://localhost:3000/api/auth/callback`.

## Quick setup

1. Paste the environment values into `.env.local`.
2. Run [supabase-schema.sql](/D:/fullstack/Roomate-Superapp/supabase-schema.sql) in the Supabase SQL editor.
3. Create a public storage bucket named `roommate-assets` or change `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`.
4. Run [supabase-policies.sql](/D:/fullstack/Roomate-Superapp/supabase-policies.sql).
5. In Supabase Auth, keep Google OAuth and email/password enabled. Do not enable phone/SMS auth.
6. Add `http://localhost:3000/api/auth/callback` to your Supabase Auth redirect allow list and set `NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO=http://localhost:3000/api/auth/callback`.
7. Restart the dev server after any `.env.local` change.

## Image upload notes

- Uploads now go through `/api/upload`, not directly from the browser.
- The route validates the signed-in session server-side, uploads with the service role, then inserts an `images` row with `owner_id`.
- If `public.images` has not been created yet, uploads now still return the public file URL so the form can keep moving, but you should still run `supabase-schema.sql` to restore metadata tracking.
>>>>>>> 6c5ad34f88195045209d1f9c8e8293090a095822
- If your `images` table uses different column names, align it with:
  - `owner_id`
  - `bucket`
  - `path`
  - `public_url`
  - `kind`
  - `is_public`
  - `created_at`

<<<<<<< HEAD
## Monthly Rent Validation

- Frontend fields should sanitize non-numeric characters before submit.
- Server routes should reject values outside `0` to `10,000,000`.
- Postgres is protected by the `monthly_rent_range` check constraint in `supabase-schema.sql`.

## Admin Panel

- `/admin` should be protected server-side.
- Admin routes must use the service role key only on the server.
- Expected admin value:
  - `profiles.role = 'admin'`

## Verification Steps

1. Run `npm run dev`.
2. Open `http://localhost:3000/sign-in`.
3. Sign in with an existing Google or email account.
4. Create or edit a listing and verify monthly rent blocks invalid values.
5. Upload a listing image and confirm there are no RLS insert errors.
6. Open room and roommate cards and confirm detail pages load from Supabase-backed data.
7. Visit `/admin`, `/admin/users`, and `/admin/listings` with an admin profile and verify actions work.
=======
## Monthly rent validation

- Frontend sanitizes non-numeric characters before submit.
- API routes reject values outside `0` to `10,000,000`.
- Postgres is protected by the `monthly_rent_range` check constraint in `supabase-policies.sql`.

## Admin panel

- `/admin` is now protected server-side.
- Admin routes use the service-role-backed helper and the profile `role` field.
- Expected admin values:
  - `profiles.role = 'admin'`

## Crawl script

Install Puppeteer if it is not already available:

```bash
npm install puppeteer --save-dev
```

Run the crawler:

```bash
npm run crawl
```

It starts from `http://localhost:3000`, follows internal links, saves page HTML into `crawl-output/`, and writes `crawl-report.json`.

## Verification steps

1. Run `npm run dev`.
2. Open `http://localhost:3000/sign-in`.
3. Enter an existing email and confirm the page switches to sign-in mode.
4. Enter a new email and confirm the page switches to sign-up mode.
5. Create or edit a listing and verify monthly rent blocks invalid values.
6. Upload a listing image and confirm there are no RLS insert errors.
7. Open a room card and a roommate card and confirm the detail pages load from Supabase-backed data.
8. Visit `/admin`, `/admin/users`, and `/admin/listings` with an admin profile and verify actions work.
>>>>>>> 6c5ad34f88195045209d1f9c8e8293090a095822
