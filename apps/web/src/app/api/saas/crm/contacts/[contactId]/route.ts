import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import {
  getSaasCrmService,
  getSaasDealsService,
  getSaasOnboardingService,
  SaasCrmError,
  type ContactStatus,
  type PipelineStage,
} from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

function mapError(e: SaasCrmError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

async function resolveTenantId(req: Request): Promise<string> {
  const claims = await authenticate(req);
  const onboarding = getSaasOnboardingService();
  const tenant = await onboarding.getTenant(claims.userId);
  if (!tenant) {
    throw new SaasCrmError("Tenant not found", "NOT_FOUND");
  }
  return tenant.id;
}

export async function GET(req: Request, context: { params: Promise<{ contactId: string }> }) {
  try {
    const tenantId = await resolveTenantId(req);
    const { contactId } = await context.params;
    const crm = getSaasCrmService();
    const contact = await crm.getContact(tenantId, contactId);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    const dealsSvc = getSaasDealsService();
    const dealsContext = await dealsSvc.getContactDealsContext(tenantId, contactId);
    return NextResponse.json({ contact, dealsContext });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasCrmError) return mapError(e);
    throw e;
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ contactId: string }> }) {
  try {
    const tenantId = await resolveTenantId(req);
    const { contactId } = await context.params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const crm = getSaasCrmService();
    const contact = await crm.updateContact(tenantId, contactId, {
      name: typeof b.name === "string" ? b.name : undefined,
      email: typeof b.email === "string" ? b.email : undefined,
      phone: typeof b.phone === "string" ? b.phone : undefined,
      company: typeof b.company === "string" ? b.company : undefined,
      position: typeof b.position === "string" ? b.position : undefined,
      status: typeof b.status === "string" ? (b.status as ContactStatus) : undefined,
      pipeline_stage: typeof b.pipeline_stage === "string" ? (b.pipeline_stage as PipelineStage) : undefined,
      value: typeof b.value === "number" ? b.value : undefined,
      notes: typeof b.notes === "string" ? b.notes : undefined,
      tags: Array.isArray(b.tags) ? b.tags.filter((x): x is string => typeof x === "string") : undefined,
    });
    return NextResponse.json({ contact });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasCrmError) return mapError(e);
    throw e;
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ contactId: string }> }) {
  try {
    const tenantId = await resolveTenantId(req);
    const { contactId } = await context.params;
    const crm = getSaasCrmService();
    await crm.deleteContact(tenantId, contactId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasCrmError) return mapError(e);
    throw e;
  }
}
