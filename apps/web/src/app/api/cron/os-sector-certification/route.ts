import { NextResponse } from "next/server";

import { getOsSectorCertificationService } from "@nelvyon/os-agents";
import { verifyCronBearer } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;
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
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;
  try {
    const svc = getOsSectorCertificationService();
    const summary = await svc.getSummary();
    return NextResponse.json({ summary });
  } catch (_e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
