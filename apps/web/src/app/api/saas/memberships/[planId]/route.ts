import { NextResponse } from "next/server";
import {
  getSaasMembershipService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/saas/memberships/[planId] */
export async function PATCH(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { planId } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const svc = getSaasMembershipService();
    const plan = await svc.updatePlan(ctx.tenant.id, planId, {
      name: body.name != null ? String(body.name) : undefined,
      priceAmount: body.priceAmount != null ? Number(body.priceAmount) : undefined,
      billingInterval: body.billingInterval as "month" | "year" | "lifetime" | undefined,
      includes: body.includes as { courses?: string[]; communities?: string[]; features?: string[] } | undefined,
      affiliateCommissionPct: body.affiliateCommissionPct != null ? Number(body.affiliateCommissionPct) : undefined,
      stripePriceId: body.stripePriceId !== undefined ? (body.stripePriceId != null ? String(body.stripePriceId) : null) : undefined,
    });
    return NextResponse.json({ plan });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** DELETE /api/saas/memberships/[planId] */
export async function DELETE(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { planId } = await params;
    await getSaasMembershipService().deletePlan(ctx.tenant.id, planId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
