import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE = "__session";
const EXPIRES_IN = 60 * 60 * 24 * 5 * 1000;

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: EXPIRES_IN });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: EXPIRES_IN / 1000,
      path: "/"
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to create session", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(session, true);
    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      role: decoded.role ?? null
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });

  return NextResponse.json({ ok: true });
}
