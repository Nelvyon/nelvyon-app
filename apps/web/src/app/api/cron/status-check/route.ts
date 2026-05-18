import { NextRequest, NextResponse } from "next/server";

import { runAllChecks } from "@nelvyon/monitoring";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  await runAllChecks(baseUrl);
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
