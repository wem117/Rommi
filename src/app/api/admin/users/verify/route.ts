import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyUserSchema } from "@/lib/validations/admin.schema";

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
    const data = verifyUserSchema.parse(body);

    const { userId, verify } = data;
    await adminDb.collection("users").doc(userId).set({ verified: verify, verifiedAt: verify ? new Date() : null }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Admin verify failed", error);
    const status = error?.message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: error?.message ?? String(error) }, { status });
  }
}
