export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasConnectRebillingService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const svc = getSaasConnectRebillingService();
    const [records, summary] = await Promise.all([
      svc.listForAgency(ctx.tenant.id),
      svc.getLedgerSummary(ctx.tenant.id),
    ]);
    return NextResponse.json({ records, summary });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as {
      subcuentaTenantId?: string;
      subcuentaId?: string;
      grossAmountEur?: number;
      platformFeeEur?: number;
      description?: string;
    };
    const record = await getSaasConnectRebillingService().createPending({
      agencyTenantId: ctx.tenant.id,
      subcuentaTenantId: String(body.subcuentaTenantId ?? ""),
      subcuentaId: body.subcuentaId,
      grossAmountEur: Number(body.grossAmountEur ?? 0),
      platformFeeEur: Number(body.platformFeeEur ?? 0),
      description: body.description,
    });
    return NextResponse.json(record, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
