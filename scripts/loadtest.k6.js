/*
 * k6 load / stress test for Roomi.
 *
 * This models realistic public + authenticated user flows. It is written to be
 * run against a STAGING deployment — never production, and never against the
 * Supabase free tier (you will exhaust the connection pool and get throttled).
 *
 * Usage:
 *   BASE_URL=https://staging.your-domain.example \
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon> \
 *   TEST_EMAIL=loadtest@example.com TEST_PASSWORD=... \
 *   k6 run scripts/loadtest.k6.js
 *
 * Ramp profiles (override with --stage or env SCENARIO):
 *   smoke   -> 1 VU, sanity
 *   load    -> ramps to 100 VUs
 *   stress  -> ramps to 1000 VUs, finds the breaking point
 *
 * The thresholds below are the pass/fail gate: p95 < 800ms for reads,
 * error rate < 1%. Tune to your SLOs.
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SUPABASE_URL = __ENV.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || "";
const TEST_EMAIL = __ENV.TEST_EMAIL || "";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "";
const SCENARIO = __ENV.SCENARIO || "load";

const errorRate = new Rate("errors");
const browseLatency = new Trend("browse_latency", true);
const searchLatency = new Trend("search_latency", true);

const STAGES = {
  smoke: [{ duration: "30s", target: 1 }],
  load: [
    { duration: "1m", target: 100 },
    { duration: "3m", target: 100 },
    { duration: "1m", target: 0 }
  ],
  stress: [
    { duration: "2m", target: 100 },
    { duration: "2m", target: 500 },
    { duration: "2m", target: 1000 },
    { duration: "3m", target: 1000 },
    { duration: "2m", target: 0 }
  ]
};

export const options = {
  stages: STAGES[SCENARIO],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    errors: ["rate<0.01"],
    "browse_latency": ["p(95)<800", "p(99)<2000"],
    "search_latency": ["p(95)<1200"]
  }
};

// Direct PostgREST reads mimic exactly what the browser client does on the
// public browse pages (data fetching is client-side in this app).
function restHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: "application/json"
  };
}

function landing() {
  group("landing", () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { "landing 200": (r) => r.status === 200 }) || errorRate.add(1);
    browseLatency.add(res.timings.duration);
  });
}

function browseRooms() {
  group("browse_rooms", () => {
    // Page shell (client component) ...
    const page = http.get(`${BASE_URL}/rooms`);
    check(page, { "rooms shell 200": (r) => r.status === 200 }) || errorRate.add(1);

    // ... then the actual data call the client makes to Supabase.
    if (SUPABASE_URL) {
      const res = http.get(
        `${SUPABASE_URL}/rest/v1/listings?select=*&removed=is.false&status=eq.approved&order=created_at.desc&limit=9`,
        { headers: { ...restHeaders(), Prefer: "count=exact" } }
      );
      check(res, { "listings data 200": (r) => r.status === 200 }) || errorRate.add(1);
      browseLatency.add(res.timings.duration);
    }
  });
}

function searchRooms() {
  group("search_rooms", () => {
    if (!SUPABASE_URL) return;
    const term = ["almaty", "studio", "kbtu", "center"][Math.floor(Math.random() * 4)];
    const pattern = encodeURIComponent(`%${term}%`);
    // Mirrors the ILIKE OR-filter in getListings() — the query most likely to
    // be a full table scan without a trigram index.
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/listings?select=*&or=(title.ilike.${pattern},description.ilike.${pattern},city.ilike.${pattern})&limit=9`,
      { headers: restHeaders() }
    );
    check(res, { "search 200": (r) => r.status === 200 }) || errorRate.add(1);
    searchLatency.add(res.timings.duration);
  });
}

function browseRoommates() {
  group("browse_roommates", () => {
    if (!SUPABASE_URL) return;
    // Mirrors getRoommateProfiles(): explicit safe columns, limit 150.
    const cols =
      "uid,full_name,age,gender,university,occupation,min_budget,max_budget,photo_url,bio,verified,created_at";
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/profiles?select=${cols}&onboarding_complete=eq.true&looking_for_apartment=eq.true&order=created_at.desc&limit=150`,
      { headers: restHeaders() }
    );
    check(res, { "roommates 200": (r) => r.status === 200 }) || errorRate.add(1);
    browseLatency.add(res.timings.duration);
  });
}

// Authenticated flow: password grant against GoTrue, then an authed read.
function authFlow() {
  if (!SUPABASE_URL || !TEST_EMAIL) return;
  group("auth", () => {
    const login = http.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      { headers: { ...restHeaders(), "Content-Type": "application/json" } }
    );
    const ok = check(login, { "login 200": (r) => r.status === 200 });
    if (!ok) {
      errorRate.add(1);
      return;
    }
    const token = login.json("access_token");
    const authed = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" };

    const convos = http.get(
      `${SUPABASE_URL}/rest/v1/conversations?select=*&order=updated_at.desc`,
      { headers: authed }
    );
    check(convos, { "conversations 200": (r) => r.status === 200 }) || errorRate.add(1);
  });
}

export default function () {
  landing();
  sleep(Math.random() * 2);
  browseRooms();
  sleep(Math.random() * 2);
  searchRooms();
  sleep(Math.random() * 2);
  browseRoommates();
  sleep(Math.random() * 2);
  authFlow();
  sleep(Math.random() * 3);
}
