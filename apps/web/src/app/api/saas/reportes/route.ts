export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasAttributionService,
  SaasAttributionError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type TrackEventInput,
  type AttributionEventType,
} from "@nelvyon/saas";

function mapErr(e: SaasAttributionError): NextResponse {
  return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
}

/** GET /api/saas/reportes
 *  ?resource=channels&days=30   → channel breakdown
 *  ?resource=campaigns&days=30  → campaign breakdown
 *  ?resource=summary&days=30    → aggregate summary
 *  ?resource=journey&contactId= → contact journey
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") ?? "summary";
    const days = Number(searchParams.get("days") ?? "30");
    const svc = getSaasAttributionService();

    if (resource === "channels") {
      const channels = await svc.getChannelBreakdown(ctx.tenant.id, days);
      return NextResponse.json({ channels });
    }

    if (resource === "campaigns") {
      const campaigns = await svc.getCampaignBreakdown(ctx.tenant.id, days);
      return NextResponse.json({ campaigns });
    }

    if (resource === "journey") {
      const contactId = searchParams.get("contactId") ?? "";
      const journey = await svc.getContactJourney(ctx.tenant.id, contactId);
      return NextResponse.json({ journey });
    }

    // default: summary
    const summary = await svc.getSummary(ctx.tenant.id, days);
    return NextResponse.json({ summary });
  } catch (e: unknown) {
    if (e instanceof SaasAttributionError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/reportes — track attribution event */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = await req.json() as Record<string, unknown>;
    const svc = getSaasAttributionService();
    const input: TrackEventInput = {
      contactId:   b.contactId   ? String(b.contactId)   : null,
      utmSource:   b.utmSource   ? String(b.utmSource)   : null,
      utmMedium:   b.utmMedium   ? String(b.utmMedium)   : null,
      utmCampaign: b.utmCampaign ? String(b.utmCampaign) : null,
      utmContent:  b.utmContent  ? String(b.utmContent)  : null,
      utmTerm:     b.utmTerm     ? String(b.utmTerm)     : null,
      pageUrl:     b.pageUrl     ? String(b.pageUrl)     : null,
      referrer:    b.referrer    ? String(b.referrer)    : null,
      eventType:   b.eventType   ? String(b.eventType) as AttributionEventType : "visit",
    };
    const event = await svc.trackEvent(ctx.tenant.id, input);
    return NextResponse.json({ event }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasAttributionError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
