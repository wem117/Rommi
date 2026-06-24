import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { listingActionSchema } from "@/lib/validations/admin.schema";

async function requireAdmin(request: Request) {
  const session = request.headers.get("cookie")?.split("; ").find((c) => c.startsWith("__session="))?.split("=")[1];
  if (!session) throw new Error("Unauthenticated");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const profile = await adminDb.collection("users").doc(decoded.uid).get();
  const role = decoded.role ?? (profile.exists ? profile.data()?.role : null);
  if (role !== "admin") throw new Error("Forbidden");
  return decoded;
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const data = listingActionSchema.parse(body);

    const { listingId, action } = data;
    const docRef = adminDb.collection("listings").doc(listingId);
    if (action === "remove") {
      await docRef.set({ removed: true, removedAt: new Date() }, { merge: true });
    } else {
      await docRef.set({ removed: false, removedAt: null }, { merge: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Listing action failed", error);
    const status = error?.message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: error?.message ?? String(error) }, { status });
  }
}
