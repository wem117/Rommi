function readErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object" || !(field in error)) {
    return "";
  }

  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

export function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return readErrorField(error, "message");
}

export function getErrorCode(error: unknown) {
  return readErrorField(error, "code");
}

export function isMissingSupabaseTable(error: unknown, tableName?: string) {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const expected = tableName ? `public.${tableName}` : "public.";

  return code === "PGRST205" && message.includes(expected);
}

/**
 * True when an RPC call failed because the database function doesn't exist yet
 * (migration not applied). PostgREST returns PGRST202; Postgres 42883. Lets
 * callers fall back to a legacy client-side path instead of hard-failing.
 */
export function isMissingRpc(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  return (
    code === "PGRST202" ||
    code === "42883" ||
    /could not find the function|function .* does not exist/i.test(message)
  );
}

export function debugSupabaseError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  if (error && typeof error === "object") {
    return {
      code: readErrorField(error, "code"),
      message: readErrorField(error, "message"),
      details: readErrorField(error, "details"),
      hint: readErrorField(error, "hint")
    };
  }

  return { message: String(error ?? "") };
}

export function friendlySupabaseError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message = getErrorMessage(error);

  if (!message) {
    return fallback;
  }

  if (/could not find the table 'public\./i.test(message)) {
    return "Your Supabase schema is incomplete. Apply the migrations in supabase/migrations (supabase db push), then refresh.";
  }

  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return "Connection issue. Check your internet connection and try again.";
  }

  if (/invalid login credentials/i.test(message)) {
    return "That email and password combination was not recognized.";
  }

  // Password-reset / email-delivery specific cases (surfaced so the cause is
  // actionable instead of a generic "could not send").
  if (/for security purposes|only request this after|rate limit|too many requests|429/i.test(message)) {
    return "Too many attempts. Please wait a minute before requesting another email.";
  }

  if (/error sending|sending.*email|smtp|email.*not.*(sent|delivered)|confirmation email|recovery email/i.test(message)) {
    return "We couldn't send the email. Email delivery may not be configured yet — please contact support.";
  }

  if (/redirect.*(not allowed|invalid)|invalid.*redirect|url.*not allowed/i.test(message)) {
    return "This link's redirect URL isn't allowed. An admin must add it to Supabase Auth → URL Configuration.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Please confirm your email before signing in.";
  }

  if (/already registered|user already registered|already been registered|duplicate key/i.test(message)) {
    return "An account with that email already exists. Try signing in instead.";
  }

  if (/row-level security|permission denied|violates row-level security|not allowed/i.test(message)) {
    return "You do not have permission for that action yet. Try again after signing in.";
  }

  if (/password/i.test(message) && /6/i.test(message)) {
    return "Passwords must be at least 6 characters long.";
  }

  if (/monthly rent|rent/i.test(message) && /10000000|10,000,000/i.test(message)) {
    return "Monthly rent must be between 0 and 10,000,000 KZT.";
  }

  if (/unauthenticated|jwt|session/i.test(message)) {
    return "Your session expired. Please sign in again.";
  }

  if (/bucket.*not found|storage.*not found/i.test(message)) {
    return "The storage bucket is missing. Create the configured bucket in Supabase Storage and try again.";
  }

  return fallback;
}
