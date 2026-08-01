import { beforeAll, describe, expect, it } from "vitest";

/**
 * The single most important property of the password-recovery request path:
 * it must NOT be PKCE.
 *
 * GoTrueClient.resetPasswordForEmail() attaches a `code_challenge` if and only
 * if `flowType === "pkce"`, and that challenge is what makes GoTrue mint a link
 * redeemable by exactly one browser. Recovery links are opened on other devices
 * by design, so a regression here silently breaks password reset for everyone
 * who checks mail on their phone — with a "link is invalid or has expired"
 * message that points at the wrong thing entirely.
 */

type AuthInternals = { flowType?: string; persistSession?: boolean; detectSessionInUrl?: boolean };

let getSupabaseRecoveryRequestClient: typeof import("@/lib/supabase/client").getSupabaseRecoveryRequestClient;
let getSupabaseBrowserClient: typeof import("@/lib/supabase/client").getSupabaseBrowserClient;

beforeAll(async () => {
  // supabaseConfig reads these at module-evaluation time.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://api.roomi.kz";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  // createClient() eagerly constructs a RealtimeClient, which demands a global
  // WebSocket. The browser always has one and Node 22 does too — but this
  // project targets Node 20 (.nvmrc, Dockerfile, CI), where it does not exist,
  // so without this the suite passes locally and fails in CI. Nothing here ever
  // opens a connection; the constructor just has to find a callable.
  if (!("WebSocket" in globalThis)) {
    (globalThis as { WebSocket?: unknown }).WebSocket = class {
      close() {}
    };
  }

  ({ getSupabaseRecoveryRequestClient, getSupabaseBrowserClient } = await import("@/lib/supabase/client"));
});

describe("recovery request client", () => {
  it("uses the implicit flow, so no code_challenge is sent to /recover", () => {
    const auth = getSupabaseRecoveryRequestClient().auth as unknown as AuthInternals;
    expect(auth.flowType).toBe("implicit");
  });

  it("is inert: it cannot persist a session or touch the URL", () => {
    const auth = getSupabaseRecoveryRequestClient().auth as unknown as AuthInternals;
    // persistSession:false makes auth-js use in-memory storage, so this client
    // can never overwrite the real session or its stored code verifier.
    expect(auth.persistSession).toBe(false);
    expect(auth.detectSessionInUrl).toBe(false);
  });

  it("is a separate instance from the shared browser client", () => {
    expect(getSupabaseRecoveryRequestClient()).not.toBe(getSupabaseBrowserClient());
  });

  it("is memoised", () => {
    expect(getSupabaseRecoveryRequestClient()).toBe(getSupabaseRecoveryRequestClient());
  });

  it("keeps PKCE for everything else (OAuth stays same-browser)", () => {
    const auth = getSupabaseBrowserClient().auth as unknown as AuthInternals;
    expect(auth.flowType).toBe("pkce");
  });
});
