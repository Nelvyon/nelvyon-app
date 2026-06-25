import { type NextRequest, NextResponse } from "next/server";
import { getSaasCpqEnterpriseService, SaasCpqEnterpriseError, requireSaasContext } from "@nelvyon/saas";
import type { CpqContractStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as CpqContractStatus | null;
    const svc = getSaasCpqEnterpriseService();
    const contracts = await svc.listContracts(ctx.tenant.id, status ?? undefined);
    return NextResponse.json({ contracts });
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[contracts GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
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
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[contracts POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
