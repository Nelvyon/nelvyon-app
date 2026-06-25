import { NextRequest, NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import {
  getSaasLoyaltyService,
  SaasLoyaltyError,
} from "../../../../../../../backend/saas/SaasLoyaltyService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapErr(e: SaasLoyaltyError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "INSUFFICIENT" ? 422 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const saasCtx = await requireSaasContext(req, "loyalty.read");
    const tid = saasCtx.tenant.id;
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") ?? "program";
    const svc = getSaasLoyaltyService();

    if (resource === "program") {
      return NextResponse.json(await svc.getOrCreateProgram(tid));
    }
    if (resource === "balances") {
      return NextResponse.json(await svc.listBalances(tid));
    }
    if (resource === "transactions") {
      const contactId = url.searchParams.get("contactId") ?? "";
      if (!contactId) return NextResponse.json({ error: "contactId requerido" }, { status: 400 });
      return NextResponse.json(await svc.getTransactions(tid, contactId));
    }
    if (resource === "balance") {
      const contactId = url.searchParams.get("contactId") ?? "";
      if (!contactId) return NextResponse.json({ error: "contactId requerido" }, { status: 400 });
      return NextResponse.json(await svc.getBalance(tid, contactId));
    }
    return NextResponse.json({ error: "resource inválido" }, { status: 400 });
  } catch (e) {
    if (e instanceof SaasLoyaltyError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const saasCtx = await requireSaasContext(req, "loyalty.write");
    const tid = saasCtx.tenant.id;
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const svc = getSaasLoyaltyService();

    if (action === "earn") {
      const contactId  = String(body.contactId ?? "").trim();
      const eurAmount  = Number(body.eurAmount ?? 0);
      if (!contactId || eurAmount <= 0) return NextResponse.json({ error: "contactId y eurAmount requeridos" }, { status: 400 });
      return NextResponse.json(await svc.earnPoints(tid, contactId, eurAmount, body.reason as string | undefined, body.referenceId as string | undefined));
    }

    if (action === "redeem") {
      const contactId = String(body.contactId ?? "").trim();
      const points    = Number(body.points ?? 0);
      if (!contactId || points <= 0) return NextResponse.json({ error: "contactId y points requeridos" }, { status: 400 });
      return NextResponse.json(await svc.redeemPoints(tid, contactId, points, body.reason as string | undefined));
    }

    if (action === "adjust") {
      const contactId = String(body.contactId ?? "").trim();
      const points    = Number(body.points ?? 0);
      if (!contactId) return NextResponse.json({ error: "contactId requerido" }, { status: 400 });
      return NextResponse.json(await svc.adjustPoints(tid, contactId, points, body.reason as string | undefined));
    }

    if (action === "update-program") {
      return NextResponse.json(await svc.updateProgram(tid, {
        pointsPerEur: body.pointsPerEur !== undefined ? Number(body.pointsPerEur) : undefined,
        tiers:        Array.isArray(body.tiers) ? body.tiers as { name: string; min_points: number }[] : undefined,
        active:       body.active       !== undefined ? Boolean(body.active)      : undefined,
      }));
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (e) {
    if (e instanceof SaasLoyaltyError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
