import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasDataPlaybooksService,
  SaasDataPlaybooksError,
  requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { id } = await params;
    const svc = getSaasDataPlaybooksService();
    const playbook = await svc.getPlaybook(ctx.tenant.id, id);
    return NextResponse.json({ playbook });
  } catch (e) {
    if (e instanceof SaasDataPlaybooksError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[data-playbooks/[id] GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { action?: "activate" | "dismiss" | "complete" };
    const svc = getSaasDataPlaybooksService();

    let playbook;
    if (body.action === "activate") playbook = await svc.activatePlaybook(ctx.tenant.id, id);
    else if (body.action === "dismiss") playbook = await svc.dismissPlaybook(ctx.tenant.id, id);
    else if (body.action === "complete") playbook = await svc.completePlaybook(ctx.tenant.id, id);
    else return NextResponse.json({ error: "action inválida", code: "VALIDATION" }, { status: 400 });

    return NextResponse.json({ playbook });
  } catch (e) {
    if (e instanceof SaasDataPlaybooksError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[data-playbooks/[id] PATCH]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
