# Supabase Migration Guide

## Where To Paste Credentials

Copy `.env.example` to `.env.local` and fill these values:

`NEXT_PUBLIC_SUPABASE_URL`
The public project URL. The browser client uses this to connect to Supabase Auth, Database, and Storage.

`NEXT_PUBLIC_SUPABASE_ANON_KEY`
The public anonymous key. The client app uses this for sign-in, listing reads, profile reads, and uploads.

`SUPABASE_SERVICE_ROLE_KEY`
The private server key. Server routes use this for protected actions like creating listings, moderating reports, and admin updates. Never expose this in the browser.

`NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
The storage bucket name for avatars, listing photos, and chat images. The code defaults to `roommate-assets`.

`NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO`
Optional OAuth callback URL for Google sign-in. Use your deployed auth callback URL or local dev callback.

`NEXT_PUBLIC_SUPPORT_EMAIL`
Optional support contact used in future UX and help surfaces.

## What Changed From Firebase

Before:
The project used Firebase Auth, Firestore, Firebase Storage, and Firebase Admin session cookies.

Now:
The active app flow uses Supabase Auth, Postgres-backed tables, Supabase Storage, and server-side cookie validation with Supabase tokens.

Main migration differences:

- Firebase client/auth helpers were replaced by `src/lib/supabase/*`.
- Firestore-style page queries were moved into modular data services under `src/lib/data/*`.
- Session verification now happens through `/api/auth/session` using Supabase access tokens.
- Listing creation, edits, report handling, and admin moderation now target Supabase-ready routes.
- The app can fall back to demo content for browse surfaces when Supabase is not configured yet.

## Suggested Supabase Tables

Create tables that match the new service layer:

`profiles`
- `uid` text primary key
- `email` text
- `full_name` text
- `age` int
- `gender` text
- `university` text
- `occupation` text
- `min_budget` int
- `max_budget` int
- `preferred_move_in_date` timestamptz nullable
- `lifestyle` jsonb
- `onboarding_complete` boolean
- `looking_for_apartment` boolean default `true`
- `photo_url` text nullable
- `bio` text nullable
- `role` text default `'user'`
- `verified` boolean default `false`
- `profile_completion` int default `0`
- `favorite_listing_ids` text[] default `{}`
- `favorite_roommate_ids` text[] default `{}`
- `viewed_listing_ids` text[] default `{}`
- `contacted_listing_ids` text[] default `{}`
- `banned` boolean default `false`
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

`listings`
- `id` uuid primary key default `gen_random_uuid()`
- `owner_id` text
- `title` text
- `description` text
- `property_type` text
- `listing_type` text
- `monthly_rent` int
- `deposit_required` boolean default `false`
- `deposit_amount` int default `0`
- `city` text
- `district` text nullable
- `address` text
- `bedrooms` int
- `bathrooms` numeric
- `available_from` timestamptz
- `amenities` text[] default `{}`
- `preferences` jsonb
- `photo_urls` text[] default `{}`
- `removed` boolean default `false`
- `removed_at` timestamptz nullable
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

`conversations`
- `id` uuid primary key default `gen_random_uuid()`
- `participant_ids` text[]
- `listing_id` uuid nullable
- `listing_title` text nullable
- `last_message` text nullable
- `last_message_at` timestamptz nullable
- `unread_counts` jsonb default `'{}'::jsonb`
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

`messages`
- `id` uuid primary key default `gen_random_uuid()`
- `conversation_id` uuid
- `sender_id` text
- `text` text
- `image_url` text nullable
- `read_by` text[] default `{}`
- `created_at` timestamptz default now()

`reports`
- `id` uuid primary key default `gen_random_uuid()`
- `reporter_id` text
- `target_id` text
- `target_type` text
- `reason` text
- `details` text nullable
- `status` text default `'open'`
- `admin_note` text nullable
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

## Storage Setup

Create one public bucket:

`roommate-assets`

Expected paths:

- `avatars/<userId>/<file>`
- `listings/<userId>/<file>`
- `messages/<conversationId>/<file>`

## Improvements Made

- Replaced Firebase-first architecture with modular Supabase config, auth, session, storage, and data services.
- Added a demo-data fallback so marketing and browse pages still render before credentials are configured.
- Expanded the landing page to better match the provided reference: featured listings, compatibility section, FAQ, testimonials, and stronger CTAs.
- Added a lightweight language selector so the product can grow into bilingual support more cleanly.
- Added listing deposit support, roommate visibility toggles, saved roommate data, and lightweight viewed/contacted history fields.
- Simplified future maintenance by centralizing data access in `src/lib/data/*` instead of calling the database directly from many pages.

## Setup Checklist

1. Create the Supabase project.
2. Fill `.env.local` with the values listed above.
3. Run `supabase-schema.sql` in the Supabase SQL editor.
4. Create the storage bucket.
5. Run `supabase-policies.sql` in the Supabase SQL editor.
6. Add Google Auth in Supabase if you want Google sign-in.
7. Run `npm install`.
8. Start the app with `npm run dev`.

