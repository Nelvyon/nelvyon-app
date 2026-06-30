import { NextResponse } from "next/server";

import { bffDegraded, BFF_DEGRADED_OAUTH } from "@/lib/bffDegraded";
import { EMPTY_CONNECTION } from "@/lib/reputacionBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(EMPTY_CONNECTION);
}

export async function POST() {
  return NextResponse.json(
    bffDegraded(
      {
        ...EMPTY_CONNECTION,
        connected: false,
        profile_name: null,
        last_sync_at: null,
      },
      BFF_DEGRADED_OAUTH,
    ),
    { status: 503 },
  );
}
