/**
 * Provider-agnostic structured logger + error capture.
 *
 * Why this exists: the app previously had only scattered `console.error` calls,
 * so production errors were invisible. This gives one structured entry point for
 * logs and exceptions that:
 *   • emits JSON lines (parseable by Vercel/Datadog/Loki/CloudWatch) in prod,
 *     pretty console output in dev;
 *   • forwards exceptions to an external error tracker when configured, with no
 *     hard dependency on any specific vendor SDK.
 *
 * Configure error forwarding by setting SENTRY_DSN (server) — the module posts
 * to Sentry's Store endpoint via fetch, so no @sentry/* package is required and
 * the bundle stays lean. Absent a DSN it degrades to structured console output.
 */

import "server-only";

type Level = "debug" | "info" | "warn" | "error";

type Fields = Record<string, unknown>;

const isProd = process.env.NODE_ENV === "production";
const SENTRY_DSN = process.env.SENTRY_DSN ?? "";
const RELEASE = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.APP_RELEASE ?? "unknown";

function serialize(level: Level, message: string, fields?: Fields) {
  return JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    release: RELEASE,
    ...fields
  });
}

function emit(level: Level, message: string, fields?: Fields) {
  if (isProd) {
    // Structured single-line JSON for log aggregators.
    const line = serialize(level, message, fields);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }

  // Dev: readable output.
  const tag = `[${level.toUpperCase()}]`;
  if (level === "error") console.error(tag, message, fields ?? "");
  else if (level === "warn") console.warn(tag, message, fields ?? "");
  else console.log(tag, message, fields ?? "");
}

/** Parse a Sentry DSN into the pieces needed to build the ingest URL + auth. */
function parseDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    const host = url.host;
    const publicKey = url.username;
    if (!projectId || !publicKey) return null;
    return { projectId, host, publicKey };
  } catch {
    return null;
  }
}

async function forwardToSentry(error: unknown, context?: Fields) {
  const parsed = parseDsn(SENTRY_DSN);
  if (!parsed) return;

  const { projectId, host, publicKey } = parsed;
  const endpoint = `https://${host}/api/${projectId}/store/`;
  const err = error instanceof Error ? error : new Error(String(error));

  const payload = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    release: RELEASE,
    environment: process.env.NODE_ENV ?? "production",
    exception: {
      values: [{ type: err.name, value: err.message, stacktrace: { frames: [] } }]
    },
    extra: { stack: err.stack, ...context }
  };

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=roomi-logger/1.0`
      },
      body: JSON.stringify(payload),
      // Never let telemetry hang a request.
      signal: AbortSignal.timeout(2000)
    });
  } catch {
    // Telemetry must never throw into the request path.
  }
}

export const logger = {
  debug: (message: string, fields?: Fields) => emit("debug", message, fields),
  info: (message: string, fields?: Fields) => emit("info", message, fields),
  warn: (message: string, fields?: Fields) => emit("warn", message, fields),
  error: (message: string, fields?: Fields) => emit("error", message, fields)
};

/**
 * Capture an exception: structured log + best-effort forward to the error
 * tracker. Safe to await or fire-and-forget; it never throws.
 */
export async function captureException(error: unknown, context?: Fields) {
  emit("error", error instanceof Error ? error.message : String(error), {
    ...context,
    stack: error instanceof Error ? error.stack : undefined
  });
  await forwardToSentry(error, context);
}
