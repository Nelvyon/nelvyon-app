export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasWhiteLabelService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const svc = getSaasWhiteLabelService();

    if (action === "stripe-connect-status") {
      const status = await svc.getStripeConnectStatus(ctx.tenant.id);
      return NextResponse.json(status);
    }

    const config = await svc.getConfig(ctx.tenant.id);
    return NextResponse.json({ config });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as string | undefined;
    const svc = getSaasWhiteLabelService();

    if (action === "create-stripe-connect") {
      const result = await svc.createStripeConnectAccount(
        ctx.tenant.id,
        String(body.email ?? ""),
        String(body.businessName ?? ctx.tenant.companyName ?? "Agency"),
      );
      return NextResponse.json(result);
    }

    if (action === "stripe-connect-onboarding-url") {
      const result = await svc.getStripeConnectOnboardingUrl(
        ctx.tenant.id,
        String(body.returnUrl ?? ""),
        String(body.refreshUrl ?? body.returnUrl ?? ""),
      );
      return NextResponse.json(result);
    }

    if (action === "sync-stripe-connect") {
      const status = await svc.syncStripeConnectStatus(ctx.tenant.id);
      return NextResponse.json(status);
    }

    // Default: upsert white-label config
    const config = await svc.upsertConfig(ctx.tenant.id, body as Parameters<typeof svc.upsertConfig>[1]);
    return NextResponse.json({ config });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const ok = await getSaasWhiteLabelService().deactivate(ctx.tenant.id);
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
