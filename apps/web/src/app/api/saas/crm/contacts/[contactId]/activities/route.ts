import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasCrmService, getSaasOnboardingService, SaasCrmError, type ActivityType } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

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
    const activity = await crm.getActivities(contactId, tenantId);
    return NextResponse.json({ activity });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasCrmError) return mapError(e);
    throw e;
  }
}

export async function POST(req: Request, context: { params: Promise<{ contactId: string }> }) {
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
    if (typeof b.activityType !== "string" || b.activityType.trim().length === 0) {
      return NextResponse.json({ error: "activityType is required" }, { status: 400 });
    }
    if (typeof b.description !== "string" || b.description.trim().length === 0) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }
    const crm = getSaasCrmService();
    const activity = await crm.addActivity(contactId, tenantId, {
      activityType: b.activityType as ActivityType,
      description: b.description,
      scheduledAt: typeof b.scheduledAt === "string" ? b.scheduledAt : null,
      completed: b.completed === true,
    });
    return NextResponse.json({ activity }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasCrmError) return mapError(e);
    throw e;
  }
}
