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

export async function POST(req: Request, ctx: { params: Promise<{ campaniaId: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "campanias.launch");
    const { campaniaId } = await ctx.params;
    const result = await getSaasCampaniasService().launchCampania(saasCtx.tenant.id, campaniaId);
    return NextResponse.json({ result });
  } catch (e: unknown) {
    if (e instanceof SaasCampaniasError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
