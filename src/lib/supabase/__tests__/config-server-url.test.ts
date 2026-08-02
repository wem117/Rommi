import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `supabaseConfig` is built once at module load from process.env, so each case
 * sets the environment and then re-imports with a reset module registry.
 */
async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import("../config")).supabaseConfig;
}

const ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env.SUPABASE_INTERNAL_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

describe("supabaseConfig.serverUrl", () => {
  it("falls back to the public URL when no internal route is configured", async () => {
    const cfg = await loadConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://api.roomi.kz",
      SUPABASE_INTERNAL_URL: undefined
    });
    // The default must be a no-op: hosts without an internal route behave
    // exactly as they did before this option existed.
    expect(cfg.serverUrl).toBe("https://api.roomi.kz");
    expect(cfg.url).toBe("https://api.roomi.kz");
  });

  it("uses the internal origin for server traffic while the public URL is untouched", async () => {
    const cfg = await loadConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://api.roomi.kz",
      SUPABASE_INTERNAL_URL: "http://kong:8000"
    });
    expect(cfg.serverUrl).toBe("http://kong:8000");
    // Browsers cannot resolve `kong`, so anything user-facing must stay public.
    expect(cfg.url).toBe("https://api.roomi.kz");
  });

  it("treats a blank internal URL as unset", async () => {
    const cfg = await loadConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://api.roomi.kz",
      SUPABASE_INTERNAL_URL: "   "
    });
    expect(cfg.serverUrl).toBe("https://api.roomi.kz");
  });

  it("strips trailing slashes so path joins never double up", async () => {
    const cfg = await loadConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://api.roomi.kz/",
      SUPABASE_INTERNAL_URL: "http://kong:8000//"
    });
    expect(cfg.serverUrl).toBe("http://kong:8000");
    expect(`${cfg.serverUrl}/rest/v1/x`).toBe("http://kong:8000/rest/v1/x");
  });
});

describe("public URL re-anchoring (upload route contract)", () => {
  // Mirrors the transform in src/app/api/upload/route.ts. A stored URL pointing
  // at an internal origin would be a permanently broken image link.
  function reanchor(generated: string, serverUrl: string, publicUrl: string) {
    return serverUrl && serverUrl !== publicUrl
      ? generated.replace(serverUrl, publicUrl)
      : generated;
  }

  it("rewrites an internal storage URL back to the public origin", () => {
    expect(
      reanchor(
        "http://kong:8000/storage/v1/object/public/roommate-assets/avatars/u/x.jpg",
        "http://kong:8000",
        "https://api.roomi.kz"
      )
    ).toBe("https://api.roomi.kz/storage/v1/object/public/roommate-assets/avatars/u/x.jpg");
  });

  it("leaves the URL alone when no internal origin is in use", () => {
    const url = "https://api.roomi.kz/storage/v1/object/public/roommate-assets/a/b.jpg";
    expect(reanchor(url, "https://api.roomi.kz", "https://api.roomi.kz")).toBe(url);
  });
});
