import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getErrorMessage } from "@/lib/utils/errors";

/**
 * Maps a thrown value to a consistent JSON error response for route handlers.
 *
 * Well-known sentinel messages are translated to their conventional HTTP status
 * codes; everything else falls back to `fallbackStatus` (400 by default).
 */
export function apiErrorResponse(error: unknown, fallbackStatus = 400) {
  // Zod validation errors: surface the first issue as a readable field message
  // instead of the raw serialized issue list.
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const path = issue?.path?.join(".");
    const message = issue ? (path ? `${path}: ${issue.message}` : issue.message) : "Invalid input.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const message = getErrorMessage(error) || "Something went wrong. Please try again.";

  const status =
    message === "Forbidden"
      ? 403
      : message === "UNAUTHENTICATED"
        ? 401
        : fallbackStatus;

  return NextResponse.json({ error: message }, { status });
}
