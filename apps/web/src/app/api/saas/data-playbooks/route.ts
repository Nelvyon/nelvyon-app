import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasDataPlaybooksService,
  requireSaasContext,
  type PlaybookStatus, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as PlaybookStatus | null;
    const svc = getSaasDataPlaybooksService();
    const [summary, playbooks] = await Promise.all([
      svc.getSummary(ctx.tenant.id),
      svc.listPlaybooks(ctx.tenant.id, status ?? undefined),
    ]);
    return NextResponse.json({ summary, playbooks });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[data-playbooks GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
