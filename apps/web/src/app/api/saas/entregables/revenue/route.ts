import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasDeliverableRevenueService,
  SaasDeliverableRevenueError,
  requireSaasContext,
  type RevenueAttributionModel,
  type LinkDeliverableInput,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const model = (searchParams.get("model") ?? "last_touch") as RevenueAttributionModel;

    const svc = getSaasDeliverableRevenueService();
    const items = await svc.listRevenueByDeliverable(ctx.tenant.id, days, model);
    return NextResponse.json({ items, model, days });
  } catch (e) {
    if (e instanceof SaasDeliverableRevenueError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[entregables/revenue GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as { action?: string; deliverableId?: string } & LinkDeliverableInput;
    const svc = getSaasDeliverableRevenueService();

    if (body.action === "refresh") {
      const days = 30;
      const result = await svc.refreshAll(ctx.tenant.id, days);
      return NextResponse.json({ result });
    }

    // Link action
    if (!body.deliverableId) {
      return NextResponse.json({ error: "deliverableId required" }, { status: 400 });
    }
    const link = await svc.linkDeliverable(ctx.tenant.id, body.deliverableId, {
      deliverableSource: body.deliverableSource,
      utmCampaign: body.utmCampaign,
      externalCampaignId: body.externalCampaignId,
      landingUrl: body.landingUrl,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (e) {
    if (e instanceof SaasDeliverableRevenueError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[entregables/revenue POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
