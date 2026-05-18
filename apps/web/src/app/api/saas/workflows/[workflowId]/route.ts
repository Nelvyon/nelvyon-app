import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasOnboardingService, getSaasWorkflowService, SaasWorkflowError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

function mapError(e: SaasWorkflowError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { workflowId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const workflow = await getSaasWorkflowService().getWorkflow(tenant.id, workflowId);
    if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    return NextResponse.json({ workflow });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasWorkflowError) return mapError(e);
    throw e;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { workflowId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const body = (await req.json()) as Record<string, unknown>;
    const workflow = await getSaasWorkflowService().updateWorkflow(tenant.id, workflowId, body);
    return NextResponse.json({ workflow });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasWorkflowError) return mapError(e);
    throw e;
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ workflowId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { workflowId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    await getSaasWorkflowService().deleteWorkflow(tenant.id, workflowId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasWorkflowError) return mapError(e);
    throw e;
  }
}
