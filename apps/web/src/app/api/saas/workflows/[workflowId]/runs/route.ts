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

export async function GET(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.read");
    const { workflowId } = await ctx.params;
    const runs = await getSaasWorkflowService().getWorkflowRuns(workflowId, saasCtx.tenant.id);
    return NextResponse.json({ runs });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
