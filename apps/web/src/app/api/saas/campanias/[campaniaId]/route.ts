import { NextResponse } from "next/server";

import {
  getSaasCampaniasService,
  requireSaasContext,
  SaasCampaniasError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasCampaniasError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, ctx: { params: Promise<{ campaniaId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "campanias.read");
    const { campaniaId } = await ctx.params;
    const campania = await getSaasCampaniasService().getCampania(saasCtx.tenant.id, campaniaId);
    if (!campania) return NextResponse.json({ error: "Campania not found" }, { status: 404 });
    return NextResponse.json({ campania });
  } catch (e: unknown) {
    if (e instanceof SaasCampaniasError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ campaniaId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "campanias.write");
    const { campaniaId } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const campania = await getSaasCampaniasService().updateCampania(saasCtx.tenant.id, campaniaId, body);
    return NextResponse.json({ campania });
  } catch (e: unknown) {
    if (e instanceof SaasCampaniasError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ campaniaId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "campanias.delete");
    const { campaniaId } = await ctx.params;
    await getSaasCampaniasService().deleteCampania(saasCtx.tenant.id, campaniaId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasCampaniasError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
