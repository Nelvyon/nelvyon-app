import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasOnboardingService, getSaasWorkflowService, SaasWorkflowError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { workflowId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const workflow = await getSaasWorkflowService().activateWorkflow(tenant.id, workflowId);
    return NextResponse.json({ workflow });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasWorkflowError) return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    throw e;
  }
}
