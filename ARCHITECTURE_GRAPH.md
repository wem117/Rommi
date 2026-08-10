# Roomi — Comprehensive Architecture Graph

> **Generated**: 2026-08-09
> **Project**: Roomi — Student roommate/room finder for Kazakhstan
> **Stack**: Next.js 15 (App Router) + React 19 + Supabase (Auth, Postgres, Storage) + Tailwind CSS + TypeScript
> **Separate Service**: Python/Telethon Telegram Import Worker

---

## 1. SYSTEM ARCHITECTURE (High-Level Component Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL CLIENTS                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │   Browser   │  │   Mobile    │  │   Search    │  │   Telegram       │  │
│  │   (React)   │  │   Web/PWA   │  │   Engines   │  │   Channels       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘  │
└─────────┼────────────────┼────────────────┼──────────────────┼────────────┘
          │                │                │                  │
          ▼                ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NGINX (Reverse Proxy)                              │
│              TLS termination • gzip • asset caching • security headers      │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 15 APP (Node.js Standalone)                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         APP ROUTER                                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │   │
│  │  │ (auth)  │ │ (main)  │ │ admin/  │ │ api/    │ │ (legal)     │  │   │
│  │  │ routes  │ │ routes  │ │ dashboard│ │ handlers│ │ routes      │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────┬──────┘  │   │
│  └───────┼───────────┼───────────┼───────────┼────────────┼──────────┘   │
│          │           │           │           │            │              │
│  ┌───────┴───────────┴───────────┴───────────┴────────────┴──────────┐   │
│  │                    SHARED LAYER (lib/)                              │   │
│  │  ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐  │   │
│  │  │ supabase │ │  data  │ │validat. │ │  utils   │ │  hooks     │  │   │
│  │  │ clients  │ │services│ │ schemas│ │ helpers  │ │ (React)    │  │   │
│  │  └──────────┘ └────────┘ └────────┘ └──────────┘ └────────────┘  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐
│   SUPABASE       │   │   SUPABASE       │   │   SUPABASE STORAGE       │
│   POSTGRES       │   │   AUTH           │   │   (roommate-assets)      │
│   (RLS policies) │   │   (Email/Google) │   │   Avatars • Photos       │
│                  │   │                  │   │                          │
│  • profiles      │   │  • Sign in/up    │   │  • Profile photos        │
│  • listings      │   │  • Password reset│   │  • Listing galleries     │
│  • conversations │   │  • Session mgmt  │   │  • University logos      │
│  • messages      │   │  • JWT tokens    │   │  • Testimonial images    │
│  • reports       │   │                  │   │  • Homepage assets       │
│  • universities  │   │                  │   │                          │
│  • telegram_*    │   │                  │   │                          │
│  • site_settings │   │                  │   │                          │
│  • testimonials  │   │                  │   │                          │
└──────────────────┘   └──────────────────┘   └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    TELEGRAM IMPORT SERVICE (Separate Container)             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Python 3.11 • FastAPI • Telethon (MTProto)                          │   │
│  │                                                                      │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐  │   │
│  │  │  Listener   │ │   Parser     │ │  Publisher  │ │  Sessions    │  │   │
│  │  │  (channels) │ │ (deterministic)│ │ (drafts)    │ │  (DB-backed) │  │   │
│  │  └──────┬──────┘ └──────┬───────┘ └──────┬──────┘ └──────┬───────┘  │   │
│  │         │               │                │               │            │   │
│  │         └───────────────┼────────────────┼───────────────┘            │   │
│  │                         ▼                ▼                           │   │
│  │              ┌─────────────────────────────────────┐                │   │
│  │              │        SHARED SUPABASE PROJECT      │                │   │
│  │              │  (service-role key, same DB/Storage)│                │   │
│  │              └─────────────────────────────────────┘                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```
---

---

## 17. TESTING STRUCTURE

```
TEST ORGANIZATION

NEXT.JS (Vitest)
src/lib/api/__tests__/         # rate-limit, revalidate
src/lib/auth/__tests__/        # admin-access, admin-runtime-boundary
src/lib/data/__tests__/        # listing-query, my-listings, profiles
src/lib/supabase/__tests__/    # auth-cookie, config, recovery
src/lib/utils/__tests__/       # contacts, errors, file-signature,
                               # homepage-stats, onboarding-gate,
                               # post-parser, profile-display,
                               # recovery-errors, rich-text,
                               # roommate-city, safe-redirect,
                               # similar-listings
src/lib/validations/__tests__/ # listing-location, monthly-rent
src/components/layout/__tests__/ # nav-items

TELEGRAM SERVICE (pytest)
tests/test_parser.py           # Real production posts
tests/test_db_errors.py
tests/test_peer_routing.py
tests/test_pipeline.py
tests/test_post_kinds.py
tests/test_publish_gate.py
tests/test_retry.py
tests/test_spam_filter.py

COMMANDS
npm run test          # Vitest run
npm run test:watch    # Vitest watch
cd telegram-service && pytest
```

---

## 18. MIGRATION HISTORY (Supabase)

```
32 migrations (idempotent, timestamp-ordered):

Core Schema:
000000_schema.sql           -> profiles, listings, images, conversations,
                               messages, reports, testimonials
000100_admin_cms.sql        -> Admin content tables
000200_contacts.sql         -> telegram, phone, contacts_hidden on profiles
000300_contact_privacy.sql  -> Column-level REVOKE contacts from anon
000400_privilege_columns.sql-> REVOKE privileged cols, GRANT safe only
000500_policies.sql         -> RLS policies (core)
000600_phase2.sql           -> Browse indexes, profile completion
000700_privileged_column_guard.sql -> BEFORE UPDATE trigger
000800_universities.sql     -> Comprehensive KZ university seed
000900_university_search_map.sql
001000_university_stat_overrides.sql
001100_homepage_stats.sql   -> Homepage metrics tables
001200_rename_admin_role.sql-> 'TimaEra' constant
001300_browse_indexes.sql   -> Additional indexes
001400_atomic_mutations.sql -> RPCs: toggle_favorite, get_or_create_conv,
                               bump_conversation, mark_read
001500_search_index.sql     -> Full-text search
001600_realtime.sql         -> Realtime publications
001700_terms_acceptance.sql -> Terms versioning
001800_messages_pagination_idx.sql
001900_migration_ledger.sql -> schema_migrations table (process fix)
002000_least_privilege_grants.sql -> Default privilege revokes
002100_postgis_least_privilege.sql
002200_profiles_city.sql    -> City column on profiles
002300_listing_address_optional.sql
002400_listings_owner_access.sql
002500_telegram_imports.sql -> telegram_sources, messages, listings
002600_telegram_imports_grants.sql -> service_role grants
002700_telegram_message_retries.sql
002800_telegram_deterministic_parser.sql -> lat/lng, zhk, capacity,
                               deposit, utilities, sender provenance,
                               per-source default_city
002900_telegram_roommate_drafts_and_sessions.sql -> draft_kind,
                               confidence, auto_publish, roommate drafts,
                               telegram_sessions, optional price (NULL)
003000_telegram_foreign_key_indexes.sql
003100_telegram_profile_uid_type.sql
003200_homepage_stats_public_read.sql
```
## 2. NEXT.JS ROUTE MAP (App Router) — Part 1

```
app/
├── layout.tsx                    # Root layout + metadata + Providers
├── page.tsx                      # Home page (SSR)
├── globals.css                   # Design tokens (HSL CSS variables)
├── icon.tsx                      # Favicon generation
├── manifest.ts                   # PWA manifest
├── robots.ts                     # robots.txt
├── sitemap.ts                    # sitemap.xml
├── not-found.tsx                 # 404 page
├── error.tsx                     # Global error boundary
├── global-error.tsx              # Root error boundary
├── maintenance/page.tsx          # Maintenance mode page
├── middleware.ts                 # Route protection (Edge runtime)
│
├── (auth)/                       # Public auth shell (no sidebar)
│   ├── layout.tsx
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   ├── reset-password/page.tsx
│   └── onboarding/
│       ├── layout.tsx
│       ├── step-1/page.tsx       # Profile basics
│       ├── step-2/page.tsx       # Lifestyle preferences
│       └── step-3/page.tsx       # Photo upload
│
├── (main)/                       # Authenticated app shell (with navbar)
│   ├── layout.tsx                # Navbar + auth guard
│   ├── loading.tsx               # Suspense boundary
│   ├── error.tsx
│   ├── page.tsx                  # Redirect to /rooms
│   ├── rooms/                    # Browse listings
│   │   ├── page.tsx              # List + filters (SSR first page)
│   │   ├── rooms-client.tsx      # Client wrapper (infinite scroll)
│   │   └── [listingId]/
│   │       ├── page.tsx          # Detail (SSR + requirePageAuth)
│   │       └── listing-detail-client.tsx
```
---

## 2. NEXT.JS ROUTE MAP (App Router) — Part 2

```
├── (legal)/                      # Static legal pages
│   ├── layout.tsx
│   ├── terms/page.tsx + content.tsx
│   ├── privacy/page.tsx + content.tsx
│   ├── safety/page.tsx + content.tsx
│   └── support/page.tsx + content.tsx
│
├── admin/                        # Admin dashboard (requireAdminUser in layout)
│   ├── layout.tsx                # Admin guard + sidebar
│   ├── page.tsx                  # Dashboard stats
│   ├── users/page.tsx            # User management (ban/verify)
│   ├── listings/page.tsx         # Listing moderation
│   ├── roommates/page.tsx        # Roommate profile moderation
│   ├── reports/page.tsx          # Report review queue
│   ├── categories/page.tsx       # Listing categories
│   ├── universities/page.tsx     # University management
│   ├── testimonials/page.tsx     # Homepage testimonials
│   ├── homepage/page.tsx         # Featured content
│   ├── settings/page.tsx         # Site settings (maintenance, admin emails)
│   ├── telegram/page.tsx         # Telegram session management
│   └── telegram-imports/page.tsx # Import review queue
│
└── api/                          # Route Handlers (server-only)
    ├── health/route.ts           # Health check
    ├── auth/
    │   ├── callback/route.ts     # OAuth callback
    │   ├── accept-terms/route.ts
    │   └── email-status/route.ts
    ├── listings/
    │   ├── route.ts              # GET (paginated) + POST (create)
    │   └── [listingId]/route.ts  # GET/PATCH/DELETE single
    ├── my-listings/
    │   ├── [id]/route.ts
    │   └── [id]/duplicate/route.ts
    ├── upload/route.ts           # Image upload (auth + admin kinds)
    ├── reports/
    │   ├── route.ts              # GET (admin) + POST (create) + PATCH/DELETE (admin)
    │   └── remove-content/route.ts
    ├── og/route.tsx              # Dynamic Open Graph images
    └── admin/
        ├── categories/           # CRUD
        ├── listings/             # Moderation actions
        ├── roommates/            # Moderation
        ├── settings/             # Site settings
        ├── telegram/
        │   ├── sessions/         # Session CRUD + status
        │   └── sources/          # Channel CRUD
        ├── telegram-imports/
        │   ├── route.ts          # List drafts
        │   ├── [id]/route.ts     # View draft
        │   ├── [id]/approve/route.ts
        │   └── [id]/reject/route.ts
        ├── testimonials/         # CRUD
        ├── universities/         # CRUD
        └── users/
            ├── route.ts          # List + ban/verify
            ├── [id]/route.ts
            ├── [id]/ban/route.ts
            └── [id]/verify/route.ts
```
---

## 3. SUPABASE CLIENT ARCHITECTURE (Canonical Pattern)

```
src/lib/supabase/  (SINGLE SOURCE OF TRUTH)

config.ts
  supabaseConfig = { url, anonKey, serverUrl, isConfigured }

client.ts (BROWSER ONLY)
  getSupabaseBrowserClient()
    lazy singleton, PKCE flow, persistSession
    recovery client (implicit flow)

server.ts (SERVER ONLY)
  createSupabaseServerClient() - RLS + cookies, request-scoped
  createSupabaseAdminClient() - Service role, bypasses RLS, NEVER in browser

session.ts (SERVER ONLY)
  requireSessionUser()
    1. Cookie client getUser()
    2. Fallback: Authorization header + admin client
    3. Throws "UNAUTHENTICATED"

admin.ts (SERVER ONLY)
  requireAdminUser() -> requireSessionUser() first
    3 gates (OR logic):
      1. ENV allowlist (ADMIN_EMAILS)
      2. profiles.role = 'TimaEra'
      3. site_settings.admin_emails
    Returns { user, supabase (service-role) }

mappers.ts - mapListingRow, mapProfileRow, mapConversationRow, mapMessageRow
public-server-client.ts - no cookies, public anon read for SEO
storage.ts - upload helpers + constants

RULES (enforced by CLAUDE.md + lint):
- NEVER create new Supabase clients outside this folder
- NEVER import service-role client into client components
- Data access ONLY via src/lib/data/* services
- Browser -> getSupabaseBrowserClient()
- Server (RLS) -> createSupabaseServerClient()
- Admin/privileged -> createSupabaseAdminClient() + requireAdminUser()
```
---

## 4. DATA ACCESS LAYER (src/lib/data/)

```
src/lib/data/  (SERVICE LAYER)
Pages/Routes -> Services -> Supabase (never direct)

listings.ts
  getListings(), getFeaturedListings(), getListingById()
  Fallback: demoListings when !isSupabaseConfigured

listings-server.ts
  Server-only variants for admin/SSR

profiles.ts
  getProfileById(), getProfilesByIds(), searchProfiles()
  createProfile(), updateProfile(), toggleFavorite*()
  Fallback: demoProfiles when !isSupabaseConfigured

profiles-server.ts
  Server-only variants for admin/SSR

conversations.ts
  getConversationsForUser(), ensureConversation()
  getMessages(), sendConversationMessage(), markConversationAsRead()
  Uses atomic RPCs: toggle_favorite_listing, get_or_create_conversation,
  bump_conversation_after_send, mark_conversation_read

listing-query.ts
  applyListingFilters() - shared filter logic client/server

demo.ts
  demoListings, demoProfiles, demoConversations, demoMessages

telegram-imports.ts
  getTelegramImports(), updateTelegramImport()
  approveTelegramImport(), rejectTelegramImport()

universities.ts
  getUniversities(), getUniversityBySlug()

reports.ts
  createReport(), getReports(), updateReport()

site-settings.ts
  getPublicSettings(), getPlatformSettings()

listings-admin.ts
  Admin-only listing ops (moderation, bulk actions)

seeded-hosts.ts
  Temporary host profiles for imported listings

homepage-stats.ts
  Homepage metrics (views, contacts, etc.)
```
---

## 5. DATABASE SCHEMA (ER Diagram)

```
SUPABASE POSTGRES SCHEMA (32 migrations, idempotent, RLS)

Core Tables:

profiles (PK: uid text)
  email, full_name, age, gender, university, occupation
  min/max_budget, preferred_move_in_date, lifestyle (jsonb)
  onboarding_complete, looking_for_apartment, photo_url, bio
  telegram, phone, contacts_hidden
  role, verified, banned, suspended, profile_completion
  favorite_*_ids[], viewed_*_ids[], contacted_*_ids[]
  roommate_status, terms_accepted_at/version
  created_at, updated_at

listings (PK: id uuid, FK: owner_id -> profiles.uid)
  title, description, property_type, listing_type
  monthly_rent (nullable since #0029), deposit_*
  city, district, address, university, lat/lng
  bedrooms, bathrooms, available_from
  amenities[], preferences (jsonb), photo_urls[]
  status (pending/approved/rejected), removed, archived, featured, featured_position
  created_at, updated_at

conversations (PK: id uuid)
  participant_ids[] (-> profiles.uid), listing_id (-> listings.id), listing_title
  last_message, last_message_at, unread_counts (jsonb)
  created_at, updated_at

messages (PK: id uuid, FK: conversation_id -> conversations.id, sender_id -> profiles.uid)
  text, image_url, read_by[], created_at

images (PK: id uuid, owner_id -> profiles.uid)
  bucket, path (unique), public_url, kind, is_public, created_at

reports (PK: id uuid, reporter_id -> profiles.uid)
  target_id, target_type, reason, details, status, admin_note
  created_at, updated_at

universities (PK: id uuid)
  name (unique), slug (unique), city, position, active, featured, featured_position
  logo_url, cover_image_url, description, stat_overrides (jsonb)

testimonials (PK: id uuid)
  name, role, quote, image_url, badge, position, active, created_at

site_settings (PK: key text, value jsonb)
  Keys: maintenance_mode, admin_emails, homepage_stats_*

Telegram Tables (RLS enabled, ZERO policies = service-role only):

telegram_sources (PK: id uuid)
  name, telegram_username (unique), type (channel/group), enabled, default_city
  created_at, updated_at

telegram_messages (PK: id uuid, FK: telegram_source_id -> telegram_sources.id)
  telegram_message_id, content, processed
  sender_* (telegram_id, username, first/last_name, display_name, is_bot)
  message_date, grouped_id, photo_message_ids[]
  created_at

telegram_listings (PK: id uuid, FK: telegram_message_id -> telegram_messages.id)
  status (draft/pending_review/published/rejected)
  title, description, city, district, address, price, currency
  rooms, property_type, area, floor, total_floors, capacity
  deposit_*, utilities_*, amenities[], contact_*, photo_urls[]
  parser_output (jsonb), extraction_error, reviewed_*, listing_id (-> listings.id)
  lat/lng, zhk, university, listing_kind, draft_kind (listing/roommate/unknown)
  confidence, auto_published_at, publish_blockers[], gender_preference, student_only
  roommate_wanted, metro, profile_uid (-> profiles.uid)
  created_at, updated_at

telegram_sessions (PK: id uuid)
  label, session_string (WRITE-ONLY), is_active, status, status_detail
  last_heartbeat_at, authorized_at, account_* (username, display_name, telegram_id)
  created_by, created_at, updated_at
  Unique index: single active session
```

### Key RLS Policies

profiles:
- SELECT: authenticated (all cols) + anon (safe cols only, NO contacts)
- INSERT/UPDATE: owner only (uid = auth.uid())
- PRIVILEGED COLUMNS (role, verified, banned, suspended, featured, roommate_status): REVOKED from authenticated/anon -> ONLY service_role

listings:
- SELECT: authenticated + not removed
- INSERT/UPDATE: owner only
- PRIVILEGED: removed, status, archived, featured -> ONLY service_role

conversations: SELECT/INSERT/UPDATE: participant only (auth.uid() = ANY(participant_ids))

messages: SELECT: participant of conversation; INSERT: sender = auth.uid() AND participant

reports: INSERT: reporter = auth.uid(); SELECT: reporter only (admin uses service_role)

telegram_* tables: RLS ENABLED, ZERO POLICIES -> ONLY service_role (bypasses RLS)
Admin API routes use requireAdminUser() -> createSupabaseAdminClient()
```
---

## 6. TELEGRAM IMPORT SERVICE (Python Worker)

```
telegram-service/  (Separate Container)
Python 3.11 • FastAPI • Telethon • Supabase (service-role)

main.py — FastAPI App
  lifespan: starts listener task + health endpoint
  /health -> {server: "ok", listener: state, detail}

telegram_listener.py — MTProto Listener
  run_forever(): persistent connection, auto-reconnect
  Watches telegram_sources (enabled channels/groups)
  Album reassembly (grouped_id) before parsing
  Spam filter FIRST (regex, no DB write for spam)
  parse() -> draft -> INSERT telegram_listings (pending_review)
  Publish gate evaluation (configurable thresholds)
  Auto-publish if ALL gates pass (off by default)
  Heartbeat -> telegram_sessions.last_heartbeat_at

app/
  telethon_client.py - Session resolution (DB first, file fallback)
    resolve_session(): 1. DB (telegram_sessions) 2. .session file
    build_client_async(), connect_or_raise(), report_heartbeat()
  db.py - Supabase service-role client
  config.py - Settings from env
  logging_config.py

telegram_parser/
  parser.py - PARSER_VERSION = "2.0.0"
    parse_message() -> ParsedListing
    score_confidence() (0-100 weighted checklist)
    DRAFT_KIND: listing | roommate | unknown
  extractors.py - Pure regex/keyword extraction
  patterns.py - Data-driven patterns (ЖК, price, contact, etc.)
  spam_filter.py - Runs BEFORE first DB write
  publish_gate.py - All conditions must pass for auto-publish

PARSER — DETERMINISTIC (v2.0.0)
- Zero AI, zero network, zero cost — pure regex/keyword tables
- PARSER_VERSION stored on every draft for auditability
- Confidence = weighted checklist (intent 25, contact 20, price 20,
  location 15, property_type 10, rooms 5, detail 5) = 100 max
- Two DRAFT_KINDs (never confused):
  - LISTING: place on offer -> listings + host profile
  - ROOMMATE: person looking -> profile in /roommates
- Spam filter runs BEFORE first DB write
- All patterns in patterns.py (data-driven, testable)

SESSION MANAGEMENT
- Credential: Telethon StringSession
- Source priority: 1) DB (telegram_sessions) 2) .session file
- Admin uploads via Admin -> Telegram page (one-way, never returned)
- Single active session enforced (partial unique index)
- Worker reports account identity on connect for verification
```
---

## 7. REACT COMPONENT HIERARCHY

```
src/components/  (Domain-Grouped)

layout/                          # App shell
  navbar.tsx                 # Top nav (auth + locale + theme)
  mobile-nav.tsx             # Mobile drawer
  footer.tsx                 # Site footer
  logo.tsx                   # Brand logo
  language-menu.tsx          # EN/RU/KZ switcher
  account-menu.tsx           # User dropdown (profile, admin)
  nav-items.ts               # Route definitions (typed)

auth/                              # Public auth pages
  auth-shell.tsx             # Centered card layout
  password-recovery-redirect.tsx

listings/                          # Browse + detail + create
  listing-card.tsx           # Card (grid)
  listing-grid.tsx           # Grid + infinite scroll
  listing-filters.tsx        # Filter sidebar/drawer
  pagination.tsx             # Load more / page controls
  listing-description.tsx    # Rich text rendering
  listing-owner-card.tsx     # Owner info on detail
  gallery-lightbox.tsx       # Photo viewer
  listing-gallery.tsx        # Thumbnail strip
  photo-uploader.tsx         # Multi-image upload (create)
  listing-form/
    listing-form.tsx       # Multi-step form (Zod + RHF)

roommates/                         # Roommate browse + detail
  roommate-card.tsx          # Card with compatibility bar
  compatibility-bar.tsx      # Visual lifestyle match %

chat/                              # Inbox + conversation
  conversation-list.tsx      # Sidebar list
  conversation-item.tsx      # Single row
  chat-window.tsx            # Main chat area
  message-bubble.tsx         # Single message
  message-input.tsx          # Composer (text + image)

favorites/                         # Saved items
  favorite-button.tsx        # Listing heart
  favorite-roommate-button.tsx

profile/                           # Profile view/edit
  avatar-upload.tsx          # Photo picker + upload
  lifestyle-tag-select.tsx   # Multi-select chips

map/                               # Location picker + view
  lazy-map.tsx               # Dynamic import (Leaflet/Google)
  map-view.tsx               # Google Maps (clustering)
  map-view-leaflet.tsx       # Leaflet fallback
  location-picker.tsx        # Pin + autocomplete

report/                            # Reporting UI
  report-button.tsx          # Floating action

admin/                             # Admin dashboard
  admin-image-upload.tsx     # Image upload for admin content
  admin-photo-list.tsx       # Gallery management
  quick-create.tsx           # Quick listing/roommate create

shared/                            # Cross-domain
  contact-links.tsx          # Telegram/WhatsApp/Phone icons
  multi-image-uploader.tsx   # Reusable upload zone
  search-page-shell.tsx      # Layout: filters + results
  university-combobox.tsx    # Searchable university select
  verified-badge.tsx         # Trust indicator

ui/                                # Radix-based primitives
  button.tsx, card.tsx, dialog.tsx, dropdown-menu.tsx
  input.tsx, label.tsx, select.tsx, switch.tsx, table.tsx
  tabs.tsx, textarea.tsx, checkbox.tsx, badge.tsx
  alert-dialog.tsx, carousel.tsx

Root-level:
  SkeletonAuth.tsx           # Auth gating wrapper
  StatusBanner.tsx           # Maintenance/announcement
  reveal.tsx                 # Scroll animation
  count-up.tsx               # Animated number
```
---

## 8. HOOKS & STATE MANAGEMENT

```
src/hooks/  (React Query Pattern)

use-auth.ts                  # Auth state + user profile (context)
use-current-user-profile.ts  # Current user's profile (SWR-like)
use-listings.ts              # Infinite scroll listings (filters, page)
use-roommates.ts             # Infinite scroll roommates
use-favorites.ts             # Toggle + optimistic updates
use-conversations.ts         # Conversation list + realtime
use-messages.ts              # Messages + send + read receipts
use-listing.ts               # Single listing detail
use-debounce.ts              # Generic debounce utility

PATTERN:
- Server Components fetch initial page (SSR)
- Client hooks take over with same data service (getListings, etc.)
- useListings: filtersKey serialization -> refetch on change
- Retry logic via lib/utils/retry.ts (withRetry)
- Error normalization via lib/utils/errors.ts
```

---

## 9. VALIDATION SCHEMAS (Zod)

```
src/lib/validations/  (Single Source)

listing.schema.ts        # createListingSchema, updateListingSchema
profile.schema.ts        # createProfileSchema, updateProfileSchema
message.schema.ts        # sendMessageSchema
category.schema.ts       # Admin category CRUD
university.schema.ts     # Admin university CRUD
testimonial.schema.ts    # Admin testimonial CRUD
telegram-admin.schema.ts # Telegram session/source/import schemas
telegram-import.schema.ts# Import approval schema
site-settings.schema.ts  # Admin settings
admin.schema.ts          # Admin quick create, reports
admin-quick.schema.ts    # Quick listing create
monthly-rent.ts          # Price validation (nullable, range)
shared.ts                # Common refinements (slug, phone, etc.)

USAGE: Route handlers import schemas -> parse -> apiErrorResponse() on fail
```

---

## 10. AUTHENTICATION & AUTHORIZATION FLOW

```
MIDDLEWARE + GUARDS

MIDDLEWARE (Edge Runtime)
- Protected prefixes: /profile, /my-listings, /list-a-room, /favorites, /inbox, /admin, /onboarding
- Protected DETAIL prefixes: /rooms/, /roommates/, /listings/ (list pages PUBLIC for SEO)
- Maintenance bypass: /admin, /api, /sign-in, /sign-up, etc.
- Cookie detection: sb-*-auth-token (no network call)
- Session resolution: getUser() with 2-try tolerant validation
- Auth-only pages: redirect signed-in users away
- Admin AUTHENTICATION only (redirect to /sign-in if no user)
- Admin AUTHORIZATION delegated to requireAdminUser() in layout.tsx

REQUIRESESSIONUSER (Node Runtime)
1. Cookie client getUser()
2. Fallback: Authorization header + admin client
3. Throws "UNAUTHENTICATED"

REQUIREADMINUSER (Node Runtime)
- requireSessionUser() first
- Gates (OR logic):
  1. ENV allowlist (ADMIN_EMAILS)
  2. profiles.role = 'TimaEra'
  3. site_settings.admin_emails (admin-managed, no redeploy)
- Returns { user, supabase (service-role) }

PAGE-LEVEL GUARDS
- requirePageAuth() — used in detail pages (SSR)
- Admin layout.tsx calls requireAdminUser()
- API routes call requireAdminUser() / requireSessionUser() directly
```
---

## 11. API ROUTE MAP (All Endpoints)

```
app/api/  (Route Handlers)

PUBLIC / AUTH
GET  /api/health                    -> {status, supabase, timestamp}
GET  /api/auth/callback             -> OAuth callback, set cookies
POST /api/auth/accept-terms         -> Record terms acceptance
GET  /api/auth/email-status         -> Check if email registered

LISTINGS (PUBLIC READ, AUTH WRITE)
GET  /api/listings                  -> Paginated, filtered (browser)
POST /api/listings                  -> Create (auth, Zod validation)
GET  /api/listings/[id]             -> Single listing
PATCH/DELETE /api/listings/[id]     -> Owner only

MY LISTINGS (OWNER)
GET/PATCH/DELETE /api/my-listings/[id]
POST /api/my-listings/[id]/duplicate

UPLOAD
POST /api/upload                    -> Auth + admin kinds, size/type

REPORTS
POST /api/reports                   -> Create (auth, rate-limited)
GET  /api/reports                   -> Admin only (list all)
PATCH/DELETE /api/reports           -> Admin only (moderate)
POST /api/reports/remove-content    -> Admin only

ADMIN (requireAdminUser)
Categories:    GET/POST /api/admin/categories, GET/PATCH/DELETE /[id]
Listings:      GET/POST /api/admin/listings, GET/PATCH/DELETE /[id]
               POST /action (bulk), POST /[id]/duplicate
Roommates:     GET /api/admin/roommates
Settings:      GET/PATCH /api/admin/settings
Telegram:      Sessions CRUD + status, Sources CRUD
Telegram Imports: List, View, Approve, Reject
Testimonials:  Full CRUD
Universities:  Full CRUD
Users:         List, Ban, Verify, View

INTERNAL (service-to-service)
POST /api/internal/telegram-imports/[id]/publish -> Worker callback

SEO / META
GET /api/og -> Dynamic Open Graph image (listing/roommate)
```

---

## 12. DEPLOYMENT TOPOLOGY

```
PRODUCTION (Vercel + Supabase)

VERCEL                    SUPABASE              TELEGRAM SERVICE
Next.js App (Standalone)  Postgres (RLS)        Python/Telethon
Edge: middleware          Auth                  Persistent MTProto
/api/og                   Storage               Admin-managed sessions
                          Realtime              Deterministic parser
                                                 Auto-publish gates

SHARED SUPABASE PROJECT
- Same database, same storage bucket (roommate-assets)
- Next.js: anon key (browser), service-role (admin API)
- Telegram service: service-role key only

DOCKER COMPOSE (Local/Prod-like)
nginx (reverse proxy, TLS, gzip, caching, security headers)
  ├── app (Next.js standalone, unprivileged, healthcheck)
  │    └── Supabase client -> db
  ├── db (Postgres 16, seeded from db/init/*.sql)
  └── telegram-service (Python, session volume, healthcheck)
```

---

## 13. KEY DATA FLOWS

### 13.1 Browse Listings (SSR + Client Hydration)
```
Browser -> GET /rooms
  Middleware: public (list page not protected)
  Server Component (page.tsx)
    getListings(filters, page=1) -> lib/data/listings.ts
      isSupabaseConfigured? -> demoListings : Supabase query
      applyListingFilters() (shared with client)
  SSR renders first page -> passes to rooms-client.tsx
  Client: useListings hook takes over
    Same getListings() service
    Infinite scroll via loadMore()
    Filters -> filtersKey serialization -> refetch
```

### 13.2 Create Listing (Multi-step + Upload)
```
User -> /list-a-room (3 steps)
  Step 1: Basics + Location (Zod + RHF)
  Step 2: Details + Amenities
  Step 3: Photos -> POST /api/upload (multiple)
  Final: POST /api/listings
    Route Handler:
      requireSessionUser()
      createListingSchema.parse()
      createSupabaseServerClient()
      INSERT listings (RLS: owner_id = auth.uid())
      Returns listing ID
  Redirect to /my-listings
```

### 13.3 Telegram Import -> Approve -> Publish
```
Telegram Channel
  Python Worker (Telethon)
    Album reassembly
    Spam filter (regex, zero DB writes)
    Deterministic parser (v2.0.0)
      Extract: title, price, city, ЖК, contact, etc.
      Classify: listing_kind (offer/shared/seeking)
      Map to draft_kind (listing | roommate | unknown)
      Confidence score (0-100)
      Warnings array
    INSERT telegram_listings (status=pending_review)
  Admin Panel -> /admin/telegram-imports
    GET /api/admin/telegram-imports (service-role)
    Admin reviews: edits pin, verifies fields
    POST /api/admin/telegram-imports/[id]/approve
      requireAdminUser() -> service-role client
      Branches on draft_kind:
        listing -> createListing() + createTemporaryHost()
        roommate -> createProfile() (published to /roommates)
      UPDATE telegram_listings (status=published, listing_id/profile_uid)
      Auto-publish gate also calls same approve logic
  Published listing/roommate indistinguishable from manual
```

### 13.4 Chat (Realtime)
```
User opens /inbox/[chatId]
  Server: ensureConversation(participants, listingId)
    RPC get_or_create_conversation (atomic)
    Returns conversationId
  Client: useMessages(conversationId)
    Initial: getMessages (desc, limit 50) -> reverse
    Realtime: supabase.channel('messages')
      INSERT -> append to list
      UPDATE (read_by) -> mark read
  Send: sendConversationMessage()
    INSERT message
    RPC bump_conversation_after_send (atomic unread counts)
    Realtime broadcasts to other participant
```
---

## 14. SECURITY ARCHITECTURE

```
DEFENSE IN DEPTH

NETWORK
- TLS everywhere (Vercel/Supabase/nginx)
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) via next.config.ts + nginx
- No X-Powered-By

APPLICATION
- Route protection: middleware (Edge) + page guards (Node)
- Admin: 3-gate authorization (ENV + role + settings)
- Service-role NEVER in browser code (enforced by lint + CLAUDE.md)
- Zod validation on ALL route handlers
- apiErrorResponse() — consistent error format, no stack leaks
- Rate limiting on auth/report/upload endpoints

DATABASE
- Row Level Security on ALL tables
- Column-level privileges (contacts hidden from anon)
- Privileged columns (role, verified, banned, featured)
  REVOKED from authenticated/anon -> ONLY service_role
- BEFORE UPDATE trigger (guard_privileged_columns)
- Atomic RPCs for race-prone operations (favorites, conversations)
- telegram_* tables: RLS + ZERO policies -> service-role only
- Migration ledger (supabase_migrations.schema_migrations)

TELEGRAM SERVICE
- Session credential: DB-backed (admin upload) + file fallback
- Session string: WRITE-ONLY from UI, never returned
- Spam filter BEFORE first DB write
- Deterministic parser: no AI, no external calls
- Draft kind separation (listing vs roommate) prevents mis-publish
- Auto-publish OFF by default, gated on ALL conditions
```

---

## 15. INTERNATIONALIZATION (i18n)

```
CLIENT-SIDE LOCALE

src/context/locale-context.tsx
- State: locale (en/ru/kz), persisted in localStorage
- Sets document.documentElement.lang
- Provider wraps entire app (Providers.tsx)

src/lib/i18n.ts
- Translation dictionaries (nested objects)
- t(key, locale) helper
- Pluralization helpers

USAGE
- Inline: t('key', locale) in components
- Page-level: getFaqs(locale), getSteps(locale) helpers
- Some legal pages: separate content.tsx per locale
```

---

## 16. DESIGN SYSTEM

```
TOKEN-BASED STYLING

src/app/globals.css -> HSL CSS Variables
- Light + .dark variant
- Semantic names: primary, accent, card, surface-muted, highlight,
  success, destructive, muted, border, background, foreground

tailwind.config.ts -> Maps tokens to Tailwind classes
- bg-primary, text-primary, border-border, bg-card, etc.

Fonts: font-body (Inter), font-heading (Manrope)

RULE: Prefer token classes over raw hex; migrate legacy opportunistically
```
---

## 19. FILE COUNT SUMMARY

```
TypeScript/React (Next.js):
App Router pages/layouts:     ~85 files
API route handlers:           ~35 files
Components:                   ~65 files
Hooks:                        ~9 files
lib/data services:            ~25 files
lib/supabase:                 ~12 files
lib/validations:              ~15 files
lib/utils:                    ~20 files
lib/constants:                ~3 files
Types:                        ~5 files
Context:                      ~3 files
Middleware:                   1 file
Tests:                        ~25 files
Total:                        ~303 TypeScript files

Python (Telegram Service):
App (FastAPI, DB, logging):   ~8 files
Parser (core + extractors):   ~6 files
Tests:                        ~8 files
Scripts:                      1 file
Total:                        ~23 Python files

SQL Migrations: 32 files
```

---

## 20. QUICK REFERENCE: KEY PATTERNS

| Concern | Pattern | Location |
|---------|---------|----------|
| **Supabase Client (Browser)** | `getSupabaseBrowserClient()` | `src/lib/supabase/client.ts` |
| **Supabase Client (Server RLS)** | `createSupabaseServerClient()` | `src/lib/supabase/server.ts` |
| **Supabase Admin (Service Role)** | `createSupabaseAdminClient()` | `src/lib/supabase/server.ts` |
| **Require Auth (Server)** | `requireSessionUser()` | `src/lib/supabase/session.ts` |
| **Require Admin (Server)** | `requireAdminUser()` | `src/lib/supabase/admin.ts` |
| **Data Access** | `src/lib/data/*.ts` services | Never direct Supabase in pages |
| **Validation** | Zod schemas in `src/lib/validations/` | Route handlers parse + apiErrorResponse |
| **Route Protection** | `middleware.ts` (Edge) + page guards | Auth + admin separation |
| **Component Imports** | `@/*` -> `src/*` | tsconfig.json paths |
| **Styling** | Token classes (`bg-card`, `text-primary`) | globals.css + tailwind.config.ts |
| **i18n** | `t(key, locale)` from context | `src/context/locale-context.tsx` |
| **Error Handling** | `catch (error)` (unknown) + `friendlySupabaseError()` | `src/lib/utils/errors.ts` |
| **Retry Logic** | `withRetry(fn, {onRetry})` | `src/lib/utils/retry.ts` |
| **Parser Version** | `PARSER_VERSION = "2.0.0"` | `telegram-service/telegram_parser/parser.py` |

---

*End of Architecture Graph*