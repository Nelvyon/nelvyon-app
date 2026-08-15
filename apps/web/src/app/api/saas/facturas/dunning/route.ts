import { type NextRequest, NextResponse } from "next/server";
import { getSaasCpqEnterpriseService, SaasCpqEnterpriseError, requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");
    const svc = getSaasCpqEnterpriseService();

    if (invoiceId) {
      const events = await svc.getDunningEvents(ctx.tenant.id, invoiceId);
      return NextResponse.json({ events });
    }
    const summary = await svc.getDunningSummary(ctx.tenant.id);
    return NextResponse.json({ summary });
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message }, { status: 400 });
    if ((e as { status?: number }).status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Un tenant ausente o un permiso denegado tienen su propio codigo;
    // colapsarlos en 500 los convertia en averias que no eran.
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { invoiceId } = await req.json() as { invoiceId: string };
    if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
    const events = await getSaasCpqEnterpriseService().scheduleDunning(ctx.tenant.id, invoiceId);
    return NextResponse.json({ events }, { status: 201 });
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message }, { status: 400 });
    if ((e as { status?: number }).status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Un tenant ausente o un permiso denegado tienen su propio codigo;
    // colapsarlos en 500 los convertia en averias que no eran.
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
