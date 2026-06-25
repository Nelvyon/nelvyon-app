import { NextResponse } from "next/server";
import {
  getSaasMembershipService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/saas/memberships — list plans */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource");
    const svc = getSaasMembershipService();

    if (resource === "members") {
      const planId = url.searchParams.get("planId") ?? undefined;
      const members = await svc.listMembers(ctx.tenant.id, planId);
      return NextResponse.json({ members });
    }

    if (resource === "access") {
      const contactEmail = url.searchParams.get("contactEmail") ?? "";
      const resourceType = (url.searchParams.get("resourceType") ?? "") as "course" | "community";
      const resourceId = url.searchParams.get("resourceId") ?? "";
      if (!contactEmail || !resourceType || !resourceId) {
        return NextResponse.json({ error: "contactEmail, resourceType, resourceId required" }, { status: 400 });
      }
      const hasAccess = await svc.checkAccess(ctx.tenant.id, contactEmail, resourceType, resourceId);
      return NextResponse.json({ hasAccess });
    }

    if (resource === "portal") {
      const email = url.searchParams.get("email") ?? "";
      if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
      const portal = await svc.getMemberPortal(ctx.tenant.id, email);
      return NextResponse.json(portal);
    }

    const plans = await svc.listPlans(ctx.tenant.id);
    return NextResponse.json({ plans });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/memberships — create plan or subscribe member */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "create_plan");
    const svc = getSaasMembershipService();

    if (action === "subscribe") {
      const member = await svc.subscribeMember(ctx.tenant.id, {
        planId: String(body.planId ?? ""),
        contactEmail: String(body.contactEmail ?? ""),
        contactId: body.contactId != null ? String(body.contactId) : null,
        stripeSubscriptionId: body.stripeSubscriptionId != null ? String(body.stripeSubscriptionId) : null,
        affiliateRef: body.affiliateRef != null ? String(body.affiliateRef) : null,
        expiresAt: body.expiresAt != null ? String(body.expiresAt) : null,
      });
      return NextResponse.json({ member }, { status: 201 });
    }

    if (action === "cancel") {
      await svc.cancelMember(ctx.tenant.id, String(body.memberId ?? ""));
      return NextResponse.json({ ok: true });
    }

    // Default: create_plan
    const plan = await svc.createPlan(ctx.tenant.id, {
      name: String(body.name ?? ""),
      slug: body.slug != null ? String(body.slug) : undefined,
      priceAmount: body.priceAmount != null ? Number(body.priceAmount) : undefined,
      priceCurrency: body.priceCurrency != null ? String(body.priceCurrency) : undefined,
      billingInterval: body.billingInterval as "month" | "year" | "lifetime" | undefined,
      includes: body.includes as { courses?: string[]; communities?: string[]; features?: string[] } | undefined,
      affiliateCommissionPct: body.affiliateCommissionPct != null ? Number(body.affiliateCommissionPct) : undefined,
      stripePriceId: body.stripePriceId != null ? String(body.stripePriceId) : undefined,
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
