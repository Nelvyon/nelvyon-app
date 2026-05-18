import { NextResponse } from "next/server";

import { getPremiumProduct } from "@nelvyon/billing";
import { authenticate } from "@nelvyon/auth";
import { OsAgentError, getSchemaForService, normalizeStoredIntake, osJobStore, validateIntake } from "@nelvyon/os-agents";
import { OS_PREMIUM_SERVICE_IDS } from "@nelvyon/os-agents/constants";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPremiumServiceId(id: string): boolean {
  return (OS_PREMIUM_SERVICE_IDS as readonly string[]).includes(id);
}

export async function GET(req: Request, ctx: { params: Promise<{ serviceId: string }> }): Promise<Response> {
  try {
    await authenticate(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const { serviceId } = await ctx.params;
  if (!isPremiumServiceId(serviceId)) {
    return NextResponse.json({ error: "Unknown serviceId" }, { status: 400 });
  }

  const product = getPremiumProduct(serviceId);
  return NextResponse.json({
    fields: getSchemaForService(serviceId),
    serviceLabel: product?.name ?? serviceId,
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ serviceId: string }> }): Promise<Response> {
  let claims;
  try {
    claims = await authenticate(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const { serviceId } = await ctx.params;
  if (!isPremiumServiceId(serviceId)) {
    return NextResponse.json({ error: "Unknown serviceId" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const validation = validateIntake(serviceId, body);
  if (!validation.valid) {
    return NextResponse.json({ valid: false as const, errors: validation.errors });
  }

  const snapshot = normalizeStoredIntake(serviceId, body);
  const intakeId = osJobStore.saveIntakeDraft(
    claims.tenantId,
    serviceId,
    snapshot as unknown as Record<string, unknown>,
  );
  return NextResponse.json({ valid: true as const, intakeId });
}
