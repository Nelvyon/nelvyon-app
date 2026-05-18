import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getSaasCampaniasService, getSaasOnboardingService, SaasCampaniasError } from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";

export const runtime = "nodejs";

function mapError(e: SaasCampaniasError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, ctx: { params: Promise<{ campaniaId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { campaniaId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const campania = await getSaasCampaniasService().getCampania(tenant.id, campaniaId);
    if (!campania) return NextResponse.json({ error: "Campania not found" }, { status: 404 });
    return NextResponse.json({ campania });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasCampaniasError) return mapError(e);
    throw e;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ campaniaId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { campaniaId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const body = (await req.json()) as Record<string, unknown>;
    const campania = await getSaasCampaniasService().updateCampania(tenant.id, campaniaId, body);
    return NextResponse.json({ campania });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasCampaniasError) return mapError(e);
    throw e;
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ campaniaId: string }> }) {
  try {
    const claims = await authenticate(req);
    const { campaniaId } = await ctx.params;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    await getSaasCampaniasService().deleteCampania(tenant.id, campaniaId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof SaasCampaniasError) return mapError(e);
    throw e;
  }
}
