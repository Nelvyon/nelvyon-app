import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasCpqEnterpriseService,
  SaasCpqEnterpriseError,
  requireSaasContext,
  requestIdFrom,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import type { CpqContractStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonErr(req: NextRequest, e: unknown) {
  const requestId = requestIdFrom(req);
  if (e instanceof SaasCpqEnterpriseError) {
    return NextResponse.json(
      { error: e.message, code: e.code, ...(requestId ? { requestId } : {}) },
      { status: 400 },
    );
  }
  return NextResponse.json(saasErrorBody(e, { requestId }), { status: saasErrorStatus(e) });
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as CpqContractStatus | null;
    const svc = getSaasCpqEnterpriseService();
    const contracts = await svc.listContracts(ctx.tenant.id, status ?? undefined);
    return NextResponse.json({ contracts });
  } catch (e) {
    return jsonErr(req, e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json() as Record<string, unknown>;
    const svc = getSaasCpqEnterpriseService();

    let contract;
    if (body.action === "from_quote" && typeof body.quoteId === "string") {
      contract = await svc.createContractFromQuote(ctx.tenant.id, body.quoteId);
    } else {
      contract = await svc.createContract(ctx.tenant.id, body as unknown as Parameters<typeof svc.createContract>[1]);
    }
    return NextResponse.json({ contract }, { status: 201 });
  } catch (e) {
    return jsonErr(req, e);
  }
}
