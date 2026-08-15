import { type NextRequest, NextResponse } from "next/server";
import { getSaasVoiceCommandService, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasVoiceCommandService();
    const [catalog, history] = await Promise.all([
      Promise.resolve(svc.getCatalog()),
      svc.listHistory(ctx.tenant.id, 20),
    ]);
    return NextResponse.json({ catalog, history });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[voice GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
