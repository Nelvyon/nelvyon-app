import { NextRequest, NextResponse } from "next/server";

import { CHECKOUT_STRIPE_PLANS, normalizeBillablePlan } from "@nelvyon/billing";

import {
  auditStripeRepair,
  fixStripePrices,
  summarizeRepair,
} from "../../../../../../../backend/stripe/stripeRepair";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-cron-secret")?.trim() === secret;
}

/**
 * GET /api/billing/stripe-repair — auditoría: cuenta, modo live/test, prices activos, productos.
 * POST /api/billing/stripe-repair — repara prices inexistentes (crea/reutiliza) y actualiza Railway.
 * Auth: header x-cron-secret = CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await auditStripeRepair();
    console.error("[billing/stripe-repair] audit", summarizeRepair(report));
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[billing/stripe-repair] audit failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type RepairBody = { plans?: string[]; fix?: boolean };

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RepairBody = {};
  try {
    body = (await req.json()) as RepairBody;
  } catch {
    body = {};
  }

  const requestedPlans = (body.plans ?? ["starter"])
    .map((p) => normalizeBillablePlan(p))
    .filter((p): p is (typeof CHECKOUT_STRIPE_PLANS)[number] =>
      p !== null && (CHECKOUT_STRIPE_PLANS as readonly string[]).includes(p),
    );

  if (requestedPlans.length === 0) {
    return NextResponse.json(
      { error: "plans vacío o inválido — usar starter, pro o agency" },
      { status: 400 },
    );
  }

  try {
    const report = await fixStripePrices(requestedPlans);
    console.error("[billing/stripe-repair] fix", summarizeRepair(report));
    return NextResponse.json({
      ...report,
      summary: summarizeRepair(report),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[billing/stripe-repair] fix failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
