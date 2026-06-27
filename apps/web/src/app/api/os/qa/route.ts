import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsVisualQaGateService } from "../../../../../../../backend/autonomous/qa/OsVisualQaGateService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const svc = getOsVisualQaGateService();
    const [summary, recentRuns] = await Promise.all([svc.getGateSummary(), svc.listAuditRuns({ limit: 50 })]);
    return NextResponse.json({ summary, recentRuns });
  } catch (e) {
    console.error("[os/qa GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
