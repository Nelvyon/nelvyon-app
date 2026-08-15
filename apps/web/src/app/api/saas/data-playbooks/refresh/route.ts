import { type NextRequest, NextResponse } from "next/server";
import { getSaasDataPlaybooksService, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Regenerate playbooks from the tenant's current data. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const svc = getSaasDataPlaybooksService();
    const result = await svc.refreshPlaybooks(ctx.tenant.id);
    return NextResponse.json(result);
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[data-playbooks/refresh POST]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
