export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  DragDropWorkflowService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.read");
    const { id } = await ctx.params;
    const svc = new DragDropWorkflowService();
    const workflow = await svc.getWorkflow(id, saasCtx.claims.userId);
    if (!workflow) return NextResponse.json({ error: "Flujo visual no encontrado" }, { status: 404 });
    return NextResponse.json({ workflow });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.delete");
    const { id } = await ctx.params;
    const svc = new DragDropWorkflowService();
    await svc.deleteWorkflow(id, saasCtx.claims.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
