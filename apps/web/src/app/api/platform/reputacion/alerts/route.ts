import { NextResponse } from "next/server";

import { buildDemoAlerts } from "@/lib/reputacionBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(buildDemoAlerts());
}
