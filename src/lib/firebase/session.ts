import "server-only";

import { cookies } from "next/headers";

import { adminAuth } from "@/lib/firebase/admin";

export async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    throw new Error("UNAUTHENTICATED");
  }

  return adminAuth.verifySessionCookie(sessionCookie, true);
}
