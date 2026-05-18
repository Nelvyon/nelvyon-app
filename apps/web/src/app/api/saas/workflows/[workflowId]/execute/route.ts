import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasOnboardingService, getSaasWorkflowService, SaasWorkflowError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { workflowId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      // noop
    }
    const triggerData =
      typeof body === "object" && body !== null && "triggerData" in body && typeof (body as { triggerData: unknown }).triggerData === "object"
        ? ((body as { triggerData: Record<string, unknown> }).triggerData ?? {})
        : {};
    const run = await getSaasWorkflowService().executeWorkflow(workflowId, tenant.id, triggerData);
    return NextResponse.json({ run });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasWorkflowError) return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    throw e;
  }
}
