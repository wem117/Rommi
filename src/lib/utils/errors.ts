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
    return "Your Supabase schema is incomplete. Run supabase-schema.sql and supabase-policies.sql in the SQL editor, then refresh.";
  }

  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return "Connection issue. Check your internet connection and try again.";
  }

  if (/invalid login credentials/i.test(message)) {
    return "That email and password combination was not recognized.";
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
