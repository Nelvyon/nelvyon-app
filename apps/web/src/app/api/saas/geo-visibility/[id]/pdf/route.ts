export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasGeoVisibilityReportService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSaasContext(req, "audit.read");
    const { id } = await ctx.params;
    const svc = getSaasGeoVisibilityReportService();
    const run = await svc.getRun(auth.tenant.id, id);
    if (!run) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const pdf = svc.toPdf(run);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="geo-${run.domain.replace(/\./g, "-")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
