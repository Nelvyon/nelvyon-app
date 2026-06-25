import { NextRequest, NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import {
  getSaasAffiliateService,
  SaasAffiliateError,
  type CommissionStatus,
} from "../../../../../../../backend/saas/SaasAffiliateService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasAffiliateError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "CONFLICT" ? 409 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const saasCtx = await requireSaasContext(req, "affiliates.read");
    const tid = saasCtx.tenant.id;
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") ?? "stats";
    const svc = getSaasAffiliateService();

    if (resource === "stats") {
      return NextResponse.json(await svc.getPayoutSummary(tid));
    }
    if (resource === "program") {
      return NextResponse.json(await svc.getOrCreateProgram(tid));
    }
    if (resource === "links") {
      return NextResponse.json(await svc.listLinks(tid));
    }
    if (resource === "commissions") {
      const status = url.searchParams.get("status") as CommissionStatus | null;
      return NextResponse.json(await svc.listCommissions(tid, status ?? undefined));
    }
    return NextResponse.json({ error: "resource inválido" }, { status: 400 });
  } catch (e) {
    if (e instanceof SaasAffiliateError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const saasCtx = await requireSaasContext(req, "affiliates.write");
    const tid = saasCtx.tenant.id;
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const svc = getSaasAffiliateService();

    if (action === "create-link") {
      const affiliateUserId = String(body.affiliateUserId ?? "").trim();
      if (!affiliateUserId) return NextResponse.json({ error: "affiliateUserId requerido" }, { status: 400 });
      return NextResponse.json(await svc.generateLink(tid, affiliateUserId), { status: 201 });
    }

    if (action === "track-click") {
      const code = String(body.code ?? "").trim();
      if (!code) return NextResponse.json({ error: "code requerido" }, { status: 400 });
      await svc.trackClick(tid, code);
      return NextResponse.json({ ok: true });
    }

    if (action === "track-conversion") {
      const code = String(body.code ?? "").trim();
      const amount = Number(body.amount ?? 0);
      if (!code || amount <= 0) return NextResponse.json({ error: "code y amount requeridos" }, { status: 400 });
      return NextResponse.json(await svc.trackConversion(tid, code, amount));
    }

    if (action === "approve-commission") {
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
      return NextResponse.json(await svc.approveCommission(tid, id));
    }

    if (action === "mark-paid") {
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
      return NextResponse.json(await svc.markPaid(tid, id, body.stripeTransferId as string | undefined));
    }

    if (action === "update-program") {
      return NextResponse.json(await svc.updateProgram(tid, {
        commissionPct: body.commissionPct !== undefined ? Number(body.commissionPct) : undefined,
        cookieDays:    body.cookieDays    !== undefined ? Number(body.cookieDays)    : undefined,
        active:        body.active        !== undefined ? Boolean(body.active)       : undefined,
      }));
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (e) {
    if (e instanceof SaasAffiliateError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
