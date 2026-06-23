import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { saasInvoiceService } from "../../../../../../../backend/saas/SaasInvoiceService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "invoices.read");
    const invoices = await saasInvoiceService.getInvoices(ctx.claims.userId, ctx.tenant.id);
    return NextResponse.json({ invoices });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
