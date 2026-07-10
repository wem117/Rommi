# CLAUDE.md

Guidance for AI agents and contributors working in this repository.

## What this is

Roommate KZ — a Next.js 15 (App Router) + React 19 + Supabase app for finding
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
