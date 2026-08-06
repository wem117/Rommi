"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plug,
  PlugZap,
  Plus,
  Radio,
  Trash2,
  Upload
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CITIES } from "@/lib/constants/cities";
import type { TelegramSessionSummary, TelegramSourceSummary } from "@/lib/data/telegram-admin";

/**
 * Admin → Telegram.
 *
 * The two things that used to require a shell: which account the importer
 * connects as, and which channels it reads. Both are now rows an admin can see
 * and change, and neither needs a deploy.
 *
 * The session string is write-only. It goes in through the box below and is
 * never rendered back — what this page shows is what the WORKER reported about
 * it, which is the useful part anyway: is it authorised, which account is it,
 * and when did it last actually talk to Telegram.
 */

type PublishPolicy = { enabled: boolean; minConfidence: number; requirePhotos: boolean };

const EMPTY_SOURCE = {
  name: "",
  telegramUsername: "",
  type: "channel" as const,
  enabled: true,
  priority: 100,
  defaultCity: "",
  notes: ""
};

/** "4 minutes ago" — the number an operator is actually reading for. */
function sinceLabel(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 90) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * A heartbeat older than this means the worker is not reporting, whatever the
 * stored status says. The sweeper beats every 5 minutes, so 15 is three misses
 * — long enough not to flap, short enough to notice within a coffee break.
 */
const STALE_HEARTBEAT_MS = 15 * 60 * 1000;

function sessionTone(session: TelegramSessionSummary): { label: string; className: string } {
  const stale =
    session.lastHeartbeatAt != null &&
    Date.now() - new Date(session.lastHeartbeatAt).getTime() > STALE_HEARTBEAT_MS;

  if (!session.isActive) return { label: "Not in use", className: "bg-foreground/10 text-foreground/60" };
  if (session.status === "connected" && stale)
    return { label: "Stale — no heartbeat", className: "bg-highlight/25 text-foreground/75" };
  if (session.status === "connected") return { label: "Connected", className: "bg-success/15 text-success" };
  if (session.status === "unauthorized")
    return { label: "Not authorized", className: "bg-destructive/15 text-destructive" };
  if (session.status === "error") return { label: "Error", className: "bg-destructive/15 text-destructive" };
  if (session.status === "disconnected")
    return { label: "Disconnected", className: "bg-foreground/10 text-foreground/60" };
  return { label: "Waiting for the worker", className: "bg-highlight/25 text-foreground/75" };
}

export default function AdminTelegramPage() {
  const [sessions, setSessions] = useState<TelegramSessionSummary[]>([]);
  const [sources, setSources] = useState<TelegramSourceSummary[]>([]);
  const [policy, setPolicy] = useState<PublishPolicy>({
    enabled: false,
    minConfidence: 75,
    requirePhotos: false
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [sessionString, setSessionString] = useState("");
  const [draftSource, setDraftSource] = useState({ ...EMPTY_SOURCE });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, sourcesRes, settingsRes] = await Promise.all([
        fetch("/api/admin/telegram/sessions"),
        fetch("/api/admin/telegram/sources"),
        fetch("/api/admin/settings")
      ]);
      const [sessionsJson, sourcesJson, settingsJson] = await Promise.all([
        sessionsRes.json(),
        sourcesRes.json(),
        settingsRes.json()
      ]);
      if (!sessionsRes.ok) throw new Error(sessionsJson.error ?? "Failed to load sessions");
      if (!sourcesRes.ok) throw new Error(sourcesJson.error ?? "Failed to load channels");
      setSessions(sessionsJson.sessions);
      setSources(sourcesJson.sources);
      if (settingsRes.ok && settingsJson.settings?.telegramPublish) {
        setPolicy(settingsJson.settings.telegramPublish);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(url: string, init: RequestInit, okMessage: string, key: string) {
    setBusy(key);
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...init
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "That did not work");
      toast.success(okMessage);
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not work");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function uploadSession() {
    const ok = await call(
      "/api/admin/telegram/sessions",
      { method: "POST", body: JSON.stringify({ label, sessionString }) },
      "Session uploaded — the worker will pick it up on its next reconnect",
      "upload"
    );
    if (ok) {
      setLabel("");
      setSessionString("");
    }
  }

  async function savePolicy(next: PublishPolicy) {
    // Optimistic: the switch moves under the finger, and `load()` reconciles.
    setPolicy(next);
    await call(
      "/api/admin/settings",
      { method: "PATCH", body: JSON.stringify({ telegramPublish: next }) },
      "Publishing settings saved",
      "policy"
    );
  }

  if (loading) {
    return (
      <main className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Telegram</h1>
        <p className="mt-1 text-sm text-foreground/60">
          The account the importer connects as, the channels it reads, and whether it may publish without you.
        </p>
      </header>

      {/* --- automatic publishing ------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
            Automatic publishing
          </CardTitle>
          <CardDescription>
            When every check passes — a property listing, not spam, complete fields, a contact method, all
            photos uploaded, and confidence at or above the threshold — the import goes live without review.
            Anything short of that waits for you. Roommate searches are never published automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Publish qualifying imports automatically</span>
            <Switch
              checked={policy.enabled}
              onCheckedChange={(enabled) => void savePolicy({ ...policy, enabled })}
              disabled={busy === "policy"}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="min-confidence" className="text-xs font-medium text-foreground/70">
                Minimum confidence ({policy.minConfidence})
              </Label>
              <Input
                id="min-confidence"
                type="range"
                min={0}
                max={100}
                step={5}
                value={policy.minConfidence}
                onChange={(event) => setPolicy({ ...policy, minConfidence: Number(event.target.value) })}
                onPointerUp={() => void savePolicy(policy)}
                onKeyUp={() => void savePolicy(policy)}
              />
              <p className="text-[11px] text-foreground/50">
                Scored out of 100 from what the parser established: intent, contact, price, location, property
                type. 75 means everything a reviewer would check was found.
              </p>
            </div>

            <label className="flex h-fit items-center justify-between gap-4 rounded-xl border border-border p-3">
              <span className="text-sm font-medium">Require at least one photo</span>
              <Switch
                checked={policy.requirePhotos}
                onCheckedChange={(requirePhotos) => void savePolicy({ ...policy, requirePhotos })}
                disabled={busy === "policy"}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* --- sessions ------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PlugZap className="h-4 w-4 text-primary" aria-hidden="true" />
            Telegram account
          </CardTitle>
          <CardDescription>
            Create a session string locally with <code>python scripts/create_session.py</code> and paste it
            here. It is stored write-only — this page never shows it again, and what you see below is what the
            worker reported after trying it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {sessions.length === 0 ? (
              <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-foreground/60">
                No session uploaded. The worker falls back to the session file on its volume, if one is
                installed.
              </li>
            ) : null}
            {sessions.map((session) => {
              const tone = sessionTone(session);
              return (
                <li key={session.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{session.label}</span>
                        <Badge className={tone.className}>{tone.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-foreground/60">
                        {session.account.username
                          ? `@${session.account.username}`
                          : session.account.displayName || "account not identified yet"}
                        {" · "}
                        last heartbeat {sinceLabel(session.lastHeartbeatAt)}
                      </p>
                      {session.statusDetail ? (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {session.statusDetail}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy != null}
                        onClick={() =>
                          void call(
                            `/api/admin/telegram/sessions/${session.id}`,
                            {
                              method: "POST",
                              body: JSON.stringify({
                                action: session.isActive ? "deactivate" : "activate"
                              })
                            },
                            session.isActive ? "Disconnected" : "Connected",
                            session.id
                          )
                        }
                      >
                        {session.isActive ? (
                          <>
                            <Plug className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            Disconnect
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            Use this
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={busy != null}
                        onClick={() => {
                          if (!window.confirm(`Delete the session "${session.label}"?`)) return;
                          void call(
                            `/api/admin/telegram/sessions/${session.id}`,
                            { method: "POST", body: JSON.stringify({ action: "delete" }) },
                            "Session deleted",
                            session.id
                          );
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">Delete session</span>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="session-label" className="text-xs font-medium text-foreground/70">
                  Label
                </Label>
                <Input
                  id="session-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="roomi-import"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="session-string" className="text-xs font-medium text-foreground/70">
                  Session string
                </Label>
                <Textarea
                  id="session-string"
                  value={sessionString}
                  onChange={(event) => setSessionString(event.target.value)}
                  rows={3}
                  placeholder="1BQANOTEuMTA4LjU2..."
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void uploadSession()}
              disabled={!label.trim() || !sessionString.trim() || busy != null}
            >
              {busy === "upload" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              Upload and connect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- channels ------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Channels</CardTitle>
          <CardDescription>
            What the importer reads. Lower priority runs first. Changes take effect when the worker
            reconnects — no deploy needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{source.name}</p>
                  <p className="text-xs text-foreground/60">
                    @{source.telegramUsername} · {source.type}
                    {source.defaultCity ? ` · defaults to ${source.defaultCity}` : " · no default city"}
                  </p>
                  {source.notes ? <p className="mt-1 text-xs text-foreground/50">{source.notes}</p> : null}
                </div>

                <label className="flex items-center gap-1.5 text-xs text-foreground/60">
                  Priority
                  <Input
                    type="number"
                    className="h-9 w-20"
                    defaultValue={source.priority}
                    min={0}
                    max={9999}
                    onBlur={(event) => {
                      const priority = Number(event.target.value);
                      if (priority === source.priority) return;
                      void call(
                        `/api/admin/telegram/sources/${source.id}`,
                        { method: "PATCH", body: JSON.stringify({ priority }) },
                        "Priority updated",
                        source.id
                      );
                    }}
                  />
                </label>

                <Switch
                  checked={source.enabled}
                  disabled={busy != null}
                  onCheckedChange={(enabled) =>
                    void call(
                      `/api/admin/telegram/sources/${source.id}`,
                      { method: "PATCH", body: JSON.stringify({ enabled }) },
                      enabled ? "Channel enabled" : "Channel disabled",
                      source.id
                    )
                  }
                  aria-label={`${source.enabled ? "Disable" : "Enable"} ${source.name}`}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={busy != null}
                  onClick={() => {
                    if (!window.confirm(`Remove ${source.name}? Imported drafts are kept.`)) return;
                    void call(
                      `/api/admin/telegram/sources/${source.id}`,
                      { method: "DELETE" },
                      "Channel removed",
                      source.id
                    );
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">Remove channel</span>
                </Button>
              </li>
            ))}
          </ul>

          <div className="grid gap-2 rounded-xl border border-dashed border-border p-3 sm:grid-cols-2">
            <Input
              placeholder="Name (e.g. SDU Housing)"
              value={draftSource.name}
              onChange={(event) => setDraftSource({ ...draftSource, name: event.target.value })}
            />
            <Input
              placeholder="@username or numeric id"
              value={draftSource.telegramUsername}
              onChange={(event) => setDraftSource({ ...draftSource, telegramUsername: event.target.value })}
            />
            <select
              value={draftSource.defaultCity}
              onChange={(event) => setDraftSource({ ...draftSource, defaultCity: event.target.value })}
            >
              <option value="">No default city</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Priority (100)"
              value={draftSource.priority}
              onChange={(event) =>
                setDraftSource({ ...draftSource, priority: Number(event.target.value) || 100 })
              }
            />
            <Input
              className="sm:col-span-2"
              placeholder="Notes (optional)"
              value={draftSource.notes}
              onChange={(event) => setDraftSource({ ...draftSource, notes: event.target.value })}
            />
            <div className="sm:col-span-2">
              <Button
                type="button"
                disabled={!draftSource.name.trim() || !draftSource.telegramUsername.trim() || busy != null}
                onClick={async () => {
                  const ok = await call(
                    "/api/admin/telegram/sources",
                    { method: "POST", body: JSON.stringify(draftSource) },
                    "Channel added",
                    "add-source"
                  );
                  if (ok) setDraftSource({ ...EMPTY_SOURCE });
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Add channel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
