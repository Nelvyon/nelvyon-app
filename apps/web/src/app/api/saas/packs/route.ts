import { type NextRequest, NextResponse } from "next/server";
import { getSaasPackStoreService, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasPackStoreService();
    const [summary, catalog, entitlements] = await Promise.all([
      svc.getStoreSummary(ctx.tenant.id),
      svc.getStoreCatalog(ctx.tenant.id),
      svc.listEntitlements(ctx.tenant.id),
    ]);
    return NextResponse.json({ summary, catalog, entitlements });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[packs GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
