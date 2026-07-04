import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus, getOsRecurringRunLogService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ tenantId: string }> }) {
  try {
    const auth = await requireSaasContext(req, "analytics.read");
    const { tenantId } = await ctx.params;
    if (tenantId !== auth.tenant.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const runs = await getOsRecurringRunLogService().listRuns({ tenantId, limit: 200 });
    return NextResponse.json({ tenantId, runs });
  } catch (e) {
    if (e instanceof Error && e.message !== "Internal error") {
      return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
    }
    console.error("[os/recurring/[tenantId] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
