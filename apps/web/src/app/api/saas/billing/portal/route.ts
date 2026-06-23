import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";
import { createBillingPortalSession } from "../../../../../../../../backend/stripe/stripeApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "billing.read");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const returnUrl = `${appUrl}/saas/billing`;

    const rows = await DbClient.getInstance().query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [ctx.userId],
    );
    const customerId = rows[0]?.stripe_customer_id ?? null;
    if (!customerId) {
      return NextResponse.json({ error: "Sin suscripción activa en Stripe" }, { status: 404 });
    }

    const url = await createBillingPortalSession(customerId, returnUrl);
    if (!url) {
      return NextResponse.json({ error: "Stripe no devolvió URL del portal" }, { status: 502 });
    }

    return NextResponse.json({ url });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
