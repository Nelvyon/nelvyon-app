import { NextResponse } from "next/server";

import { EMPTY_CONNECTION } from "@/lib/reputacionBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(EMPTY_CONNECTION);
}

export async function POST() {
  return NextResponse.json({
    ...EMPTY_CONNECTION,
    connected: true,
    mock: true,
    profile_name: "Negocio demo · Google Business",
    last_sync_at: new Date().toISOString(),
  });
}
