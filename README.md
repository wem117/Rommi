# Roommate KZ

Find trusted student roommates and rooms across Kazakhstan. Match by budget,
university, and lifestyle compatibility — then chat before you move in.

Built with **Next.js 15 (App Router)**, **React 19**, **Supabase** (Auth,
Postgres, Storage), **Tailwind CSS**, and **TypeScript**.

## Features

- 🔎 Browse rooms and roommates with rich filters (city, university, budget, lifestyle)
- 🧮 Lifestyle **compatibility scoring** between roommates
- 💬 Direct **chat** between users
- 📝 Multi-step listing creation and profile onboarding
- ❤️ Favorites for listings and roommates
- 🛡️ **Admin** dashboard: user verification/banning, listing moderation, report review
- 🌐 Trilingual UI (English / Русский / Қазақша)
- 🖼️ Dynamic Open Graph social cards, sitemap, robots, and PWA manifest
- 🎭 Demo-content fallback so browse surfaces work before Supabase is configured

## Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Framework  | Next.js 15 App Router, React 19, TypeScript (strict)          |
| Styling    | Tailwind CSS with a CSS-variable design-token system          |
| Backend    | Supabase — Auth, Postgres (RLS), Storage                      |
| Validation | Zod + react-hook-form                                         |
| Icons/UI   | lucide-react, sonner (toasts)                                 |

## Getting started

### Prerequisites

- Node.js 18.18+ (or 20+)
- A Supabase project

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public base URL, used for SEO metadata / sitemap / OG. Falls back to `VERCEL_URL`, then `localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser + server clients). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS-scoped access). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** service key for admin/privileged actions. Never expose to the browser. |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Storage bucket for avatars/photos (default `roommate-assets`). |
| `NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO` | Google OAuth callback URL. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support contact surfaced in the UI. |

### 3. Set up the database

In the Supabase SQL editor, run in order:

1. `supabase-schema.sql` — tables
2. `supabase-policies.sql` — Row Level Security policies
3. `supabase-migration-university-search-map.sql` — university search support

See [`SUPABASE_MIGRATION.md`](./SUPABASE_MIGRATION.md) and
[`README_SUPABASE.md`](./README_SUPABASE.md) for details.

### 4. Run

```bash
npm run dev     # http://localhost:3000
```

> Without Supabase credentials the app still boots and renders demo content on
> public browse pages; auth-gated flows require a configured project.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run crawl` | Data crawler (`scripts/crawl.js`) |

## Project structure

```
src/
├── app/                    # App Router: routes, layouts, route handlers
│   ├── (auth)/             # Sign-in/up + onboarding (public shell)
│   ├── (main)/             # Authenticated app (rooms, roommates, inbox, profile…)
│   ├── admin/              # Admin dashboard
│   ├── api/                # Route handlers (auth, listings, reports, upload, og)
│   ├── icon.tsx            # Generated favicon
│   ├── manifest.ts         # PWA manifest
│   ├── robots.ts           # robots.txt
│   ├── sitemap.ts          # sitemap.xml
│   └── layout.tsx          # Root layout + metadata/viewport
├── components/             # UI components grouped by domain
├── context/                # React context providers (auth, locale)
├── hooks/                  # Data-fetching and utility hooks
├── lib/
│   ├── supabase/           # Canonical Supabase clients (client/server/admin) + helpers
│   ├── api/                # Shared route-handler helpers (error responses)
│   ├── data/               # Data-access services (listings, profiles, conversations…)
│   ├── validations/        # Zod schemas
│   ├── utils/              # cn, format, errors, compatibility, retry
│   └── site-config.ts      # Site identity / SEO source of truth
├── middleware.ts           # Route protection + admin gating
└── types/                  # Shared TypeScript types
```

### Supabase client conventions

- **`src/lib/supabase/client.ts`** — `getSupabaseBrowserClient()` (lazy singleton, browser).
- **`src/lib/supabase/server.ts`** — `createSupabaseServerClient()` (RLS, cookie-scoped) and `createSupabaseAdminClient()` (service role, **server only**).
- **`src/lib/supabase/admin.ts`** — `requireAdminUser()` guard.
- **`src/lib/supabase/session.ts`** — `requireSessionUser()` guard.

Never import a service-role client into browser code.

## Deployment

Optimized for **Vercel**. Set all environment variables from the table above in
your project settings (`NEXT_PUBLIC_SITE_URL` should be your production domain),
then deploy. Security headers, `X-Powered-By` suppression, and image remote
patterns are configured in [`next.config.ts`](./next.config.ts).

## Security

- Row Level Security enforced in Postgres (`supabase-policies.sql`).
- Protected routes gated in `middleware.ts`; admin routes additionally check `role`.
- Server-only service-role usage behind `requireAdminUser()` / `requireSessionUser()`.
- Baseline security headers (HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) applied to every response.
