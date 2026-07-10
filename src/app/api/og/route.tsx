import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    title: "Roommate KZ",
    description: "Find student roommates and rooms across Kazakhstan."
  });
}
