import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public API v2 health probe */
export async function GET() {
  return NextResponse.json({ ok: true, version: "v2" });
}
