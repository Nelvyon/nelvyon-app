import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasOnboardingService, getSaasWorkflowService, SaasWorkflowError, type TriggerType, type WorkflowStatus } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const runtime = "nodejs";

function mapError(e: SaasWorkflowError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const workflows = await getSaasWorkflowService().getWorkflows(tenant.id);
    return NextResponse.json({ workflows });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasWorkflowError) return mapError(e);
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.name !== "string" || b.name.trim().length === 0) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (typeof b.triggerType !== "string") return NextResponse.json({ error: "triggerType is required" }, { status: 400 });
    const workflow = await getSaasWorkflowService().createWorkflow(tenant.id, {
      name: b.name,
      description: typeof b.description === "string" ? b.description : null,
      status: typeof b.status === "string" ? (b.status as WorkflowStatus) : undefined,
      triggerType: b.triggerType as TriggerType,
      triggerConfig: typeof b.triggerConfig === "object" && b.triggerConfig !== null ? (b.triggerConfig as Record<string, unknown>) : {},
      conditions: Array.isArray(b.conditions) ? (b.conditions as []) : [],
      actions: Array.isArray(b.actions) ? (b.actions as []) : [],
    });
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasWorkflowError) return mapError(e);
    throw e;
  }
}
