import { type NextRequest, NextResponse } from "next/server";
import { getSaasSectorBenchmarkService, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

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
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[benchmarks/compare POST]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
