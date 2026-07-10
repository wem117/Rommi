import { NextResponse } from "next/server";

import { getErrorMessage } from "@/lib/utils/errors";

/**
 * Maps a thrown value to a consistent JSON error response for route handlers.
 *
 * Well-known sentinel messages are translated to their conventional HTTP status
 * codes; everything else falls back to `fallbackStatus` (400 by default).
 */
export function apiErrorResponse(error: unknown, fallbackStatus = 400) {
  const message = getErrorMessage(error) || "Something went wrong. Please try again.";

  const status =
    message === "Forbidden"
      ? 403
      : message === "UNAUTHENTICATED"
        ? 401
        : fallbackStatus;

  return NextResponse.json({ error: message }, { status });
}
