import { NextResponse } from "next/server";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  return NextResponse.json(
    { status: "alive", timestamp: new Date().toISOString() },
    { status: 200, headers: NO_STORE },
  );
}
