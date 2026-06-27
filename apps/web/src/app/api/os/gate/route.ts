import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsPackGateService } from "@nelvyon/saas";
import { getOsPackCertificationService } from "../../../../../../../backend/os-agents/packs/OsPackCertificationService";
import { getOsVisualQaGateService } from "../../../../../../../backend/autonomous/qa/OsVisualQaGateService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const gate = getOsPackGateService();
    const [summary, runs, certifications, qaGate] = await Promise.all([
      gate.getSummary(),
      gate.listRuns(20),
      getOsPackCertificationService().getSummary().catch(() => null),
      getOsVisualQaGateService().getGateSummary().catch(() => null),
    ]);
    return NextResponse.json({ summary, lastRun: runs[0] ?? null, runs, certifications, qaGate });
  } catch (e) {
    console.error("[os/gate GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
