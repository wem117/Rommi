# CLAUDE.md

Guidance for AI agents and contributors working in this repository.

## What this is

Roomi — a Next.js 15 (App Router) + React 19 + Supabase app for finding
student roommates/rooms in Kazakhstan. TypeScript strict, Tailwind CSS.

## Commands

```bash
npm run dev         # dev server
npm run build       # production build (run before declaring done)
npm run start       # serve the build
npm run lint        # ESLint — keep at zero warnings
npm run typecheck   # tsc --noEmit
```

Quality gate before finishing any change: `npm run typecheck && npm run lint && npm run build` must all pass.

## Architecture rules

- **Supabase clients are canonical under `src/lib/supabase/`** — do not create
  new client modules elsewhere.
  - Browser: `getSupabaseBrowserClient()` from `supabase/client.ts`.
  - Server (RLS, cookies): `createSupabaseServerClient()` from `supabase/server.ts`.
  - Service role (**server only**): `createSupabaseAdminClient()` from `supabase/server.ts`.
  - Guards: `requireSessionUser()` (`supabase/session.ts`), `requireAdminUser()` (`supabase/admin.ts`).
  - Never import the service-role client into client components.
- **Data access lives in `src/lib/data/*`** — pages/routes call these services,
  not Supabase directly (browse services fall back to `lib/data/demo` when
  `isSupabaseConfigured` is false; preserve that pattern).
- **Route handlers** validate input with Zod schemas (`src/lib/validations/*`)
  and return errors via `apiErrorResponse()` (`src/lib/api/error-response.ts`).
  Use `catch (error)` (unknown), never `catch (error: any)`.
- **Route protection** is centralized in `src/middleware.ts` (auth + admin role).

## Telegram import service (`telegram-service/`)

A separate Python worker (Telethon + FastAPI, its own image and deploy
workflow) that watches configured Telegram channels and stages drafts for
**Admin Panel → Telegram Imports**. It shares the Supabase project and the
storage bucket, nothing else.

- **Extraction is deterministic and must stay that way.** `telegram_parser/` is
  regex, keyword tables and string handling with zero third-party imports — no
  model, no API key, no quota, no per-message cost. The previous Gemini-backed
  version lost every listing that arrived while its free-tier quota was
  exhausted. CI fails the build if any AI SDK ends up imported.
- **Nothing publishes automatically.** The worker's only write to a
  user-visible table is a `telegram_listings` row with
  `status='pending_review'`. The transition to a real listing happens solely in
  `api/admin/telegram-imports/[id]/approve`, which reuses `createListing()` /
  `createTemporaryHost()` so an approved import is indistinguishable from a
  hand-seeded one.
- **The spam filter runs before the first database write** — a non-housing post
  must cost one regex sweep and leave no row, no photo and no storage object.
- Behaviour is data: add a ЖК, a spam phrase or a price format to
  `telegram_parser/patterns.py` with a test, and bump `PARSER_VERSION`.
  `telegram-service/README.md` documents the two regex traps that have already
  cost production data.
- The `.session` file is a credential: never committed, never in the image,
  mounted from the `roomi-telegram-session` volume.

## Styling / design system

- Colors are **design tokens**, not hardcoded hex. Tokens are HSL CSS variables
  in `src/app/globals.css` (with a `.dark` variant) exposed as semantic Tailwind
  names in `tailwind.config.ts`: `primary`, `accent`, `card`, `surface-muted`,
  `highlight`, `success`, `destructive`, `muted`, `border`, `background`,
  `foreground`.
- Prefer token classes (`bg-card`, `text-primary`, `border-border`) over hex.
  Some legacy files still use raw hex — migrate opportunistically with visual QA.
- Fonts: `font-body` (Inter), `font-heading` (Manrope).

## SEO / metadata

- Site identity is centralized in `src/lib/site-config.ts` (driven by
  `NEXT_PUBLIC_SITE_URL`). Root metadata/viewport live in `src/app/layout.tsx`.
- `robots.ts`, `sitemap.ts`, `manifest.ts`, `icon.tsx`, and the dynamic OG image
  at `api/og/route.tsx` are file-convention routes — keep them in sync with
  `site-config`.

## i18n

- Trilingual (en / ru / kz) via `src/context/locale-context.tsx` + `src/lib/i18n.ts`
  (client-side locale, persisted; sets `document.documentElement.lang`).
- Some page copy is provided inline by locale-switch helper functions
  (e.g. home page `getFaqs`/`getSteps`).

## Conventions

- Import alias `@/*` → `src/*`.
- Keep lint at **zero warnings** (`no-explicit-any` is enforced as a warning).
- Run the production build to catch App-Router-only issues that `tsc` misses.
