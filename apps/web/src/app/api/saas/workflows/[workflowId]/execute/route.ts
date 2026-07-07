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
    const saasCtx = await requireSaasContext(req, "workflows.execute");
    const { workflowId } = await ctx.params;
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }
    const triggerData =
      typeof body === "object" &&
      body !== null &&
      "triggerData" in body &&
      typeof (body as { triggerData: unknown }).triggerData === "object"
        ? ((body as { triggerData: Record<string, unknown> }).triggerData ?? {})
        : {};
    const run = await getSaasWorkflowService().executeWorkflow(
      workflowId,
      saasCtx.tenant.id,
      triggerData,
      {
        idempotencyKey:
          req.headers.get("idempotency-key")?.trim().slice(0, 128) ||
          req.headers.get("x-idempotency-key")?.trim().slice(0, 128) ||
          (typeof body === "object" && body !== null && "idempotencyKey" in body
            ? String((body as { idempotencyKey?: string }).idempotencyKey ?? "").trim().slice(0, 128)
            : null) ||
          null,
      },
    );
    return NextResponse.json({ run });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
