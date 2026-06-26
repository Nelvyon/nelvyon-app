import { type NextRequest, NextResponse } from "next/server";
import { getSaasSectorBenchmarkService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Latest persisted snapshot, or a freshly computed dashboard if none exists. */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const svc = getSaasSectorBenchmarkService();

    const latest = await svc.getLatestSnapshot(ctx.tenant.id);
    if (latest) return NextResponse.json({ dashboard: latest, fromSnapshot: true });

    const periodDays = searchParams.get("days") ? parseInt(searchParams.get("days")!, 10) : undefined;
    const dashboard = await svc.buildDashboard(ctx.tenant.id, { periodDays });
    return NextResponse.json({ dashboard, fromSnapshot: false });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[benchmark GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
