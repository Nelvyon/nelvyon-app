import { type NextRequest, NextResponse } from "next/server";
import { getSaasSectorBenchmarkService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Auto-collect tenant metrics and compare against industry medians (no persist). */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const body = (await req.json().catch(() => ({}))) as {
      periodDays?: number;
      sectorKey?: string;
    };
    const svc = getSaasSectorBenchmarkService();
    const dashboard = await svc.buildDashboard(ctx.tenant.id, {
      periodDays: body.periodDays,
      sectorKey: body.sectorKey,
    });
    return NextResponse.json({ dashboard });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[benchmarks/compare POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
