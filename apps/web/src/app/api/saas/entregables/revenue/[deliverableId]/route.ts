import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasDeliverableRevenueService,
  SaasDeliverableRevenueError,
  requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { deliverableId } = await params;
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const packId = searchParams.get("packId") ?? undefined;

    const svc = getSaasDeliverableRevenueService();
    const [revenue, packSummary] = await Promise.all([
      svc.computeRevenue(ctx.tenant.id, deliverableId, days, "last_touch"),
      packId ? svc.getPackRevenueSummary(ctx.tenant.id, packId, days) : Promise.resolve(null),
    ]);
    return NextResponse.json({ revenue, packSummary });
  } catch (e) {
    if (e instanceof SaasDeliverableRevenueError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[entregables/revenue/[id] GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
