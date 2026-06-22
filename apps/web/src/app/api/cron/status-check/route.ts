import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { runAllChecks } from "@nelvyon/monitoring";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || !timingSafeEqual(secret, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  await runAllChecks(baseUrl);
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
