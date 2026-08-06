import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Admin management of the Telegram importer: the account it connects as, and
 * the channels it watches.
 *
 * Both used to be deployment concerns. The session was a file installed over
 * SSH — invisible from the admin panel, so nobody could see whether it was
 * authorised, when it last worked, or which account it belonged to. The
 * channels were rows nobody had a screen for. Between them, changing what the
 * importer did meant a shell.
 *
 * THE SESSION STRING IS NEVER RETURNED TO THE BROWSER. Every read here names
 * its columns explicitly and omits it; the UI renders status, never the
 * secret. It is a credential granting full access to a Telegram account, and
 * the only safe direction for it is inward.
 */

/** Everything about a session EXCEPT the credential itself. */
const SESSION_PUBLIC_COLUMNS =
  "id,label,is_active,status,status_detail,last_heartbeat_at,authorized_at," +
  "account_username,account_display_name,account_telegram_id,created_by,created_at,updated_at";

export interface TelegramSessionSummary {
  id: string;
  label: string;
  isActive: boolean;
  status: "unknown" | "connected" | "unauthorized" | "error" | "disconnected";
  statusDetail: string;
  lastHeartbeatAt: string | null;
  authorizedAt: string | null;
  account: { username: string; displayName: string; telegramId: number | null };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSession(row: any): TelegramSessionSummary {
  return {
    id: row.id,
    label: row.label ?? "",
    isActive: Boolean(row.is_active),
    status: row.status ?? "unknown",
    statusDetail: row.status_detail ?? "",
    lastHeartbeatAt: row.last_heartbeat_at ?? null,
    authorizedAt: row.authorized_at ?? null,
    account: {
      username: row.account_username ?? "",
      displayName: row.account_display_name ?? "",
      telegramId: row.account_telegram_id ?? null
    },
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listTelegramSessions(): Promise<TelegramSessionSummary[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("telegram_sessions")
    .select(SESSION_PUBLIC_COLUMNS)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * Stores a new session and makes it the active one.
 *
 * Activating is part of the same operation on purpose: an uploaded session that
 * nothing uses is a credential sitting in a database for no reason, and the
 * two-step version invites exactly that. The previous active row is deactivated
 * first — the partial unique index enforces one active session, and doing it in
 * this order means a failure leaves none active rather than two.
 */
export async function uploadTelegramSession(input: {
  label: string;
  sessionString: string;
  createdBy: string;
}): Promise<TelegramSessionSummary> {
  const supabase = createSupabaseAdminClient();

  const { error: clearError } = await supabase
    .from("telegram_sessions")
    .update({ is_active: false })
    .eq("is_active", true);
  if (clearError) throw clearError;

  const { data, error } = await supabase
    .from("telegram_sessions")
    .insert({
      label: input.label,
      session_string: input.sessionString,
      is_active: true,
      // The worker reports the real state once it connects. Until then this
      // says, accurately, that nothing has verified the credential yet.
      status: "unknown",
      created_by: input.createdBy
    })
    .select(SESSION_PUBLIC_COLUMNS)
    .single();

  if (error) throw error;
  return mapSession(data);
}

/** Disconnects a session without deleting it, so it can be put back. */
export async function setTelegramSessionActive(id: string, active: boolean): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (active) {
    const { error: clearError } = await supabase
      .from("telegram_sessions")
      .update({ is_active: false })
      .eq("is_active", true);
    if (clearError) throw clearError;
  }

  const { error } = await supabase
    .from("telegram_sessions")
    .update({ is_active: active, status: active ? "unknown" : "disconnected" })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTelegramSession(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("telegram_sessions").delete().eq("id", id);
  if (error) throw error;
}

// --- channels ----------------------------------------------------------------

export interface TelegramSourceSummary {
  id: string;
  name: string;
  telegramUsername: string;
  type: "channel" | "group";
  enabled: boolean;
  priority: number;
  defaultCity: string;
  notes: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSource(row: any): TelegramSourceSummary {
  return {
    id: row.id,
    name: row.name ?? "",
    telegramUsername: row.telegram_username ?? "",
    type: row.type ?? "channel",
    enabled: Boolean(row.enabled),
    priority: row.priority ?? 100,
    defaultCity: row.default_city ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at
  };
}

export async function listTelegramSources(): Promise<TelegramSourceSummary[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("telegram_sources")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapSource);
}

export interface TelegramSourceInput {
  name: string;
  telegramUsername: string;
  type: "channel" | "group";
  enabled: boolean;
  priority: number;
  defaultCity: string;
  notes: string;
}

export async function createTelegramSource(input: TelegramSourceInput): Promise<TelegramSourceSummary> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("telegram_sources")
    .insert({
      name: input.name,
      // Stored as typed. Telethon resolves "@name", "name" and a numeric id
      // alike, so normalising here would only lose what the admin entered.
      telegram_username: input.telegramUsername.replace(/^@/, ""),
      type: input.type,
      enabled: input.enabled,
      priority: input.priority,
      default_city: input.defaultCity,
      notes: input.notes
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapSource(data);
}

export async function updateTelegramSource(
  id: string,
  input: Partial<TelegramSourceInput>
): Promise<TelegramSourceSummary> {
  const supabase = createSupabaseAdminClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name;
  if (input.telegramUsername !== undefined)
    payload.telegram_username = input.telegramUsername.replace(/^@/, "");
  if (input.type !== undefined) payload.type = input.type;
  if (input.enabled !== undefined) payload.enabled = input.enabled;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.defaultCity !== undefined) payload.default_city = input.defaultCity;
  if (input.notes !== undefined) payload.notes = input.notes;

  const { data, error } = await supabase
    .from("telegram_sources")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapSource(data);
}

export async function deleteTelegramSource(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("telegram_sources").delete().eq("id", id);
  if (error) throw error;
}
