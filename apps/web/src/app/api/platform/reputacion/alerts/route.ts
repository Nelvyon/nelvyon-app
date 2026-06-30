import { NextResponse } from "next/server";

import { EMPTY_ALERTS } from "@/lib/reputacionBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(EMPTY_ALERTS);
}
