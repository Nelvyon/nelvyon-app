import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { saasInvoiceService } from "../../../../../../../../backend/saas/SaasInvoiceService";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "invoices.read");
    const { id } = await params;
    const invoice = await saasInvoiceService.getInvoiceById(id, ctx.claims.userId);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
