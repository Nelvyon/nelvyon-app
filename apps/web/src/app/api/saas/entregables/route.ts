import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasDeliverablesHubService,
  SaasDeliverablesHubError,
  requireSaasContext,
  type DeliverableType,
  type DeliverableStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as DeliverableType | null;
    const status = searchParams.get("status") as DeliverableStatus | null;
    const days = searchParams.get("days") ? parseInt(searchParams.get("days")!, 10) : 30;

    const svc = getSaasDeliverablesHubService();
    const [deliverables, summary] = await Promise.all([
      svc.listDeliverables(ctx.tenant.id, {
        type: type ?? undefined,
        status: status ?? undefined,
        days: days > 0 ? days : undefined,
      }),
      svc.getSummary(ctx.tenant.id),
    ]);

    return NextResponse.json({ deliverables, summary });
  } catch (e) {
    if (e instanceof SaasDeliverablesHubError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[entregables GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
