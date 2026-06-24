import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { reportCreateSchema, reportUpdateSchema } from "@/lib/validations/admin.schema";

export async function POST(request: Request) {
  try {
    // create report (authenticated)
    const cookie = request.headers.get("cookie")?.split("; ").find((c) => c.startsWith("__session="))?.split("=")[1];
    if (!cookie) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    const body = await request.json();
    const data = reportCreateSchema.parse(body);

    const reportRef = adminDb.collection("reports").doc();
    await reportRef.set({
      id: reportRef.id,
      ...data,
      reporterId: decoded.uid,
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ ok: true, id: reportRef.id });
  } catch (error: any) {
    console.error("Create report failed", error);
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    // update report (admin)
    const session = request.headers.get("cookie")?.split("; ").find((c) => c.startsWith("__session="))?.split("=")[1];
    if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const profile = await adminDb.collection("users").doc(decoded.uid).get();
    const role = decoded.role ?? (profile.exists ? profile.data()?.role : null);
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const data = reportUpdateSchema.parse(body);

    const { reportId, status, note } = data;
    const ref = adminDb.collection("reports").doc(reportId);
    await ref.set({ status, updatedAt: new Date(), adminNote: note ?? null }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Update report failed", error);
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 400 });
  }
}
