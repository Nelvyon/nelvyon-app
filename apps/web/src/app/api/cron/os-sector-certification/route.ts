import { NextResponse } from "next/server";

import { getOsSectorCertificationService } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const svc = getOsSectorCertificationService();
    const [batch, summary] = await Promise.all([svc.runBatchCertification(), svc.getSummary()]);
    return NextResponse.json({ ok: true, batch, summary });
  } catch (e) {
    console.error("[cron/os-sector-certification]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const svc = getOsSectorCertificationService();
    const summary = await svc.getSummary();
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
