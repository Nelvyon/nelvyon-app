import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getStripePriceId, normalizeBillablePlan } from "@nelvyon/billing";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { updateSubscriptionItemsWithProration } from "../../../../../../../backend/stripe/stripeApi";

export const runtime = "nodejs";

const MANAGEABLE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "paused"]);

type ChangePlanBody = { newPlan?: string };

export async function POST(req: NextRequest) {
  try {
    const claims = await authenticate(req);
    let body: ChangePlanBody;
    try {
      body = (await req.json()) as ChangePlanBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const newPlanRaw = body.newPlan;
    const newPlan = typeof newPlanRaw === "string" ? normalizeBillablePlan(newPlanRaw) : null;
    if (!newPlan) {
      return NextResponse.json({ error: "newPlan debe ser starter, pro o agency" }, { status: 400 });
    }

    let priceId: string;
    try {
      priceId = getStripePriceId(newPlan);
    } catch (e) {
      console.error("[change-plan] price id config:", e);
      return NextResponse.json({ error: "Configuración de precios incompleta" }, { status: 500 });
    }

    const rows = await DbClient.getInstance().query<{
      stripe_subscription_id: string | null;
      plan: string;
      subscription_status: string | null;
    }>(
      `SELECT COALESCE(s.stripe_subscription_id, s.paddle_subscription_id) AS stripe_subscription_id,
              COALESCE(s.plan, u.plan) AS plan,
              s.status AS subscription_status
       FROM nelvyon_users u
       INNER JOIN subscriptions s ON s.user_id::text = u.user_id
       WHERE u.user_id = $1
         AND COALESCE(s.stripe_subscription_id, s.paddle_subscription_id) IS NOT NULL
       LIMIT 1`,
      [claims.userId],
    );
    const row = rows[0];
    if (!row?.stripe_subscription_id?.trim()) {
      return NextResponse.json({ error: "No hay suscripción Stripe activa" }, { status: 400 });
    }

    const subStatus = (row.subscription_status ?? "").toLowerCase();
    if (!MANAGEABLE_SUBSCRIPTION_STATUSES.has(subStatus)) {
      return NextResponse.json({ error: "La suscripción no permite cambiar de plan en este momento" }, { status: 400 });
    }

    const currentPlan = normalizeBillablePlan(row.plan);
    if (!currentPlan) {
      return NextResponse.json({ error: "Plan actual no modificable desde aquí" }, { status: 400 });
    }

    if (currentPlan === newPlan) {
      return NextResponse.json({ error: "Ya estás en este plan" }, { status: 400 });
    }

    let stripeResult: { nextBilledAt: string | null; currentPeriodEndsAt: string | null };
    try {
      stripeResult = await updateSubscriptionItemsWithProration(row.stripe_subscription_id.trim(), priceId);
    } catch (e) {
      console.warn("[change-plan] Stripe update failed:", e);
      return NextResponse.json(
        { error: "Stripe no pudo aplicar el cambio de plan. Revisa el método de pago e inténtalo de nuevo." },
        { status: 402 },
      );
    }

    const planStr = newPlan;
    await DbClient.getInstance().query(`UPDATE nelvyon_users SET plan = $2, updated_at = now() WHERE user_id = $1`, [
      claims.userId,
      planStr,
    ]);
    await DbClient.getInstance().query(`UPDATE subscriptions SET plan = $2, updated_at = now() WHERE user_id::text = $1`, [
      claims.userId,
      planStr,
    ]);

    const effectiveDate =
      stripeResult.nextBilledAt ?? stripeResult.currentPeriodEndsAt ?? new Date().toISOString();

    return NextResponse.json({
      success: true,
      newPlan: planStr,
      effectiveDate,
    });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
