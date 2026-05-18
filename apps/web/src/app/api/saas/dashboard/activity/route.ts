import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasDashboardService, getSaasOnboardingService, SaasDashboardError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function resolveTenantId(req: Request): Promise<string> {
  const claims = await authenticate(req);
  const onboarding = getSaasOnboardingService();
  const tenant = await onboarding.getTenant(claims.userId);
  if (!tenant) {
    throw new SaasDashboardError("Tenant not found", "NOT_FOUND");
  }
  return tenant.id;
}

export async function GET(req: Request) {
  try {
    const tenantId = await resolveTenantId(req);
    const service = getSaasDashboardService();
    const activity = await service.getRecentActivity(tenantId, 20);
    return NextResponse.json({ activity });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasDashboardError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await resolveTenantId(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const eventType = body.eventType;
    const description = body.description;
    const metadata = body.metadata;
    if (typeof eventType !== "string" || eventType.trim().length === 0) {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }
    if (typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }
    if (metadata !== undefined && !isRecord(metadata)) {
      return NextResponse.json({ error: "metadata must be an object when provided" }, { status: 400 });
    }
    const service = getSaasDashboardService();
    await service.logActivity(tenantId, eventType, description, (metadata as Record<string, unknown> | undefined) ?? undefined);
    return NextResponse.json({ ok: true, eventType }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasDashboardError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    throw e;
  }
}
