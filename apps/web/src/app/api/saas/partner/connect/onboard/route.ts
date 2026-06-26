import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPartnerZoneService,
  SaasPartnerZoneError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Start Stripe Connect onboarding and return the redirect URL. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json().catch(() => ({}))) as { email?: string; businessName?: string };
    const origin = new URL(req.url).origin;
    const svc = getSaasPartnerZoneService();
    const { url } = await svc.startConnectOnboarding(ctx.tenant.id, {
      email: body.email ?? "",
      businessName: body.businessName ?? ctx.tenant.id,
      returnUrl: `${origin}/saas/partner?connect=done`,
      refreshUrl: `${origin}/saas/partner?connect=refresh`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof SaasPartnerZoneError) {
      const status = e.code === "PARTNER_REQUIRED" ? 403 : e.code === "NOT_CONNECTED" ? 400 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((e as { code?: string }).code === "NOT_CONNECTED" || (e as Error).message?.includes("STRIPE")) {
      return NextResponse.json(
        { error: "Stripe Connect no está configurado en este entorno", code: "STRIPE_UNCONFIGURED" },
        { status: 503 },
      );
    }
    console.error("[partner/connect/onboard POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
