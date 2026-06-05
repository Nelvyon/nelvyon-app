import { NextResponse } from "next/server";

import {
  getSaasWorkflowService,
  requireSaasContext,
  SaasWorkflowError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasWorkflowError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.read");
    const { workflowId } = await ctx.params;
    const workflow = await getSaasWorkflowService().getWorkflow(saasCtx.tenant.id, workflowId);
    if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    return NextResponse.json({ workflow });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.write");
    const { workflowId } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const workflow = await getSaasWorkflowService().updateWorkflow(saasCtx.tenant.id, workflowId, body);
    return NextResponse.json({ workflow });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.delete");
    const { workflowId } = await ctx.params;
    await getSaasWorkflowService().deleteWorkflow(saasCtx.tenant.id, workflowId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
