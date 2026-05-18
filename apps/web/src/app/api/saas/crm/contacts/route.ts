import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasCrmService, getSaasOnboardingService, SaasCrmError, type ContactStatus, type PipelineStage } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

function mapError(e: SaasCrmError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const onboarding = getSaasOnboardingService();
    const tenant = await onboarding.getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const stage = url.searchParams.get("stage") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const crm = getSaasCrmService();
    const contacts = await crm.getContacts(tenant.id, {
      status: status as ContactStatus | undefined,
      pipeline_stage: stage as PipelineStage | undefined,
      search,
    });
    return NextResponse.json({ contacts });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasCrmError) return mapError(e);
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    const onboarding = getSaasOnboardingService();
    const tenant = await onboarding.getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

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
    if (typeof b.name !== "string" || b.name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const crm = getSaasCrmService();
    const contact = await crm.createContact(tenant.id, {
      name: b.name,
      email: typeof b.email === "string" ? b.email : null,
      phone: typeof b.phone === "string" ? b.phone : null,
      company: typeof b.company === "string" ? b.company : null,
      position: typeof b.position === "string" ? b.position : null,
      status: typeof b.status === "string" ? (b.status as ContactStatus) : undefined,
      pipeline_stage: typeof b.pipeline_stage === "string" ? (b.pipeline_stage as PipelineStage) : undefined,
      value: typeof b.value === "number" ? b.value : 0,
      notes: typeof b.notes === "string" ? b.notes : null,
      tags: Array.isArray(b.tags) ? b.tags.filter((x): x is string => typeof x === "string") : [],
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof SaasCrmError) return mapError(e);
    throw e;
  }
}
