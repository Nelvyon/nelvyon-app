import { type NextRequest, NextResponse } from "next/server";
import { getSaasSectorBenchmarkService, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sector: string }> },
) {
  try {
    await requireSaasContext(req, "contacts.read");
    const { sector } = await params;
    const svc = getSaasSectorBenchmarkService();
    const industryMetrics = svc.getIndustryMetrics(sector);
    return NextResponse.json({ sector, industryMetrics });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[benchmarks/industry GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
