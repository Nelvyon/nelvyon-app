import { NextRequest, NextResponse } from "next/server";

import { runAllChecks } from "@nelvyon/monitoring";
import { verifyCronHeader } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = verifyCronHeader(req.headers.get("x-cron-secret"));
  if (denied) return denied;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  await runAllChecks(baseUrl);
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
