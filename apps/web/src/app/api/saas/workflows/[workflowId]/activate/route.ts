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

export async function POST(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.write");
    const { workflowId } = await ctx.params;
    const workflow = await getSaasWorkflowService().activateWorkflow(saasCtx.tenant.id, workflowId);
    return NextResponse.json({ workflow });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
