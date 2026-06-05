import { NextResponse } from "next/server";

import {
  getSaasDealsService,
  requireSaasContext,
  SaasDealsError,
  saasErrorBody,
  saasErrorStatus,
  type DealStage,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request, context: { params: Promise<{ dealId: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "deals.write");
    const { dealId } = await context.params;
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
    if (typeof b.stage !== "string") {
      return NextResponse.json({ error: "stage is required" }, { status: 400 });
    }
    const deal = await getSaasDealsService().changeStage(
      ctx.tenant.id,
      dealId,
      b.stage as DealStage,
      typeof b.probability === "number" ? b.probability : undefined,
    );
    return NextResponse.json({ deal });
  } catch (e: unknown) {
    if (e instanceof SaasDealsError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
