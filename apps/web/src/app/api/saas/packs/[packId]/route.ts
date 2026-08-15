import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPackStoreService,
  SaasPackStoreError,
  requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { packId } = await params;
    const svc = getSaasPackStoreService();
    const detail = await svc.getPackDetail(ctx.tenant.id, packId);
    return NextResponse.json(detail);
  } catch (e) {
    if (e instanceof SaasPackStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[packs/[id] GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
