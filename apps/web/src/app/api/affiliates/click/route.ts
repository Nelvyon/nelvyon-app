import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/security/rateLimit";
import { AffiliateService } from "../../../../../../../backend/affiliates/AffiliateService";

export const runtime = "nodejs";

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }
  const rawCode = (body as Record<string, unknown>).code;
  const code = typeof rawCode === "string" ? rawCode : "";
  if (!code || code.trim().length === 0) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const ip = getClientIp(req);
  await AffiliateService.instance().trackClick(code, {
    ipHash: hashIp(ip),
    userAgent: req.headers.get("user-agent") ?? undefined,
    referrer: req.headers.get("referer") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
