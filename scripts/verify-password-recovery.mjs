/**
 * End-to-end production check for both password-recovery methods.
 *
 * Exercises the exact SDK calls the app makes — no private endpoints, no
 * service-role key, nothing an ordinary user could not do. It needs a mailbox
 * you can read, because the whole point is to prove the credential that lands in
 * a real inbox actually works.
 *
 *   node scripts/verify-password-recovery.mjs you@example.com
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the
 * environment (or .env.local). The account's password IS changed — run it
 * against a test account, not your own.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !env[match[1]]) env[match[1]] = match[2];
    }
  } catch {
    // .env.local is optional; the environment may already carry the values.
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.argv[2];

if (!url || !anonKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or add them to .env.local).");
  process.exit(1);
}
if (!email) {
  console.error("Usage: node scripts/verify-password-recovery.mjs <email>");
  process.exit(1);
}

// flowType "implicit" so resetPasswordForEmail() does not attach a
// code_challenge — the same reason src/lib/supabase/client.ts keeps a separate
// client for this one call.
const supabase = createClient(url, anonKey, {
  auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const rl = createInterface({ input: process.stdin, output: process.stdout });
const step = (n, text) => console.log(`\n[${n}] ${text}`);
const ok = (text) => console.log(`    OK   ${text}`);
const fail = (text) => {
  console.error(`    FAIL ${text}`);
  process.exitCode = 1;
};

try {
  step(1, `Requesting a recovery email for ${email}`);
  const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL ?? "https://roomi.kz"}/reset-password?email=${encodeURIComponent(email)}`
  });
  if (sendError) throw new Error(`could not send: ${sendError.message}`);
  ok("sent");

  console.log(`
    Open the email. It must contain BOTH:
      - a link to .../reset-password?token_hash=...&type=recovery
      - a 6-digit code
    If the 6-digit code is missing, GoTrue is still serving the stock template —
    see "Password recovery" in README_SUPABASE.md.
`);

  // --- Method 2 first: it consumes the code, leaving the link untouched.
  step(2, "Method B — the 6-digit code");
  const code = (await rl.question("    Paste the 6-digit code: ")).replace(/\D/g, "");
  const byCode = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (byCode.error) throw new Error(`code rejected: ${byCode.error.message}`);
  if (!byCode.data.session) throw new Error("code accepted but no session returned");
  ok(`session established for ${byCode.data.session.user.email}`);

  step(3, "Changing the password with updateUser()");
  const newPassword = `Verify-${Date.now().toString(36)}!`;
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error(`updateUser failed: ${updateError.message}`);
  ok("password updated");

  step(4, "Signing in with the new password");
  const loginClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: login, error: loginError } = await loginClient.auth.signInWithPassword({
    email,
    password: newPassword
  });
  if (loginError) throw new Error(`sign-in failed: ${loginError.message}`);
  if (!login.session) throw new Error("sign-in returned no session");
  ok("signed in — the new password works");
  console.log(`\n    New password for ${email}: ${newPassword}\n`);

  // --- Method 1: needs a second email, since step 2 consumed the first.
  step(5, "Method A — the recovery link");
  const again = (await rl.question("    Send a second email to test the link? [y/N] ")).trim().toLowerCase();
  if (again !== "y") {
    console.log("    skipped");
  } else {
    const { error: resendError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL ?? "https://roomi.kz"}/reset-password?email=${encodeURIComponent(email)}`
    });
    if (resendError) throw new Error(`could not send: ${resendError.message}`);
    const linkUrl = await rl.question("    Paste the full link from the email: ");
    const tokenHash = new URL(linkUrl.trim()).searchParams.get("token_hash");
    if (!tokenHash) throw new Error("that link carries no token_hash — the template has not been updated");

    const byLink = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (byLink.error) throw new Error(`link rejected: ${byLink.error.message}`);
    if (!byLink.data.session) throw new Error("link accepted but no session returned");
    ok("link redeemed — session established");
  }

  console.log(`\n${process.exitCode ? "COMPLETED WITH FAILURES" : "BOTH METHODS VERIFIED"}\n`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  rl.close();
}
