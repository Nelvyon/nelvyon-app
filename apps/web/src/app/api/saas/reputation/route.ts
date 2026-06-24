import { NextResponse } from "next/server";
import {
  getSentimentMonitorService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/saas/reputation?resource=mentions|stats|alerts
 * Wraps SentimentMonitorService + Google Business Profile when GBP keys set.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") ?? "mentions";

    const gbpConfigured = !!(process.env.GOOGLE_PLACES_API_KEY?.trim() && process.env.GBP_PLACE_ID?.trim());
    const svc = getSentimentMonitorService();

    if (resource === "stats") {
      const stats = await svc.getStats(ctx.tenant.id, "30d");
      return NextResponse.json({ stats, gbp_configured: gbpConfigured });
    }

    if (resource === "alerts") {
      const alerts = await svc.getActiveAlerts(ctx.tenant.id);
      return NextResponse.json({ alerts, gbp_configured: gbpConfigured });
    }

    // mentions
    const result = await svc.getMentions(ctx.tenant.id, {
      pageSize: 50,
      channel: searchParams.get("channel") ?? undefined,
      label: (searchParams.get("label") as "positive" | "neutral" | "negative") ?? undefined,
    });

    // Google Business Profile reviews (real, when keys present)
    let gbpReviews: Array<{ id: string; author: string; rating: number; text: string; time: string }> = [];
    if (gbpConfigured) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(process.env.GBP_PLACE_ID!)}&fields=reviews&key=${process.env.GOOGLE_PLACES_API_KEY}`,
        );
        const data = await res.json() as {
          result?: { reviews?: Array<{ author_name: string; rating: number; text: string; time: number }> };
        };
        gbpReviews = (data.result?.reviews ?? []).map((r, i) => ({
          id: `gbp-${i}`, author: r.author_name, rating: r.rating,
          text: r.text, time: new Date(r.time * 1000).toISOString(),
        }));
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      mentions: result.items,
      total: result.total,
      gbp_reviews: gbpReviews,
      gbp_configured: gbpConfigured,
      gbp_message: gbpConfigured ? null : "Configura GOOGLE_PLACES_API_KEY + GBP_PLACE_ID en Railway para ver reseñas de Google.",
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/reputation — trigger sentiment check (creates alert if score < threshold) */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const result = await getSentimentMonitorService().checkAlerts(ctx.tenant.id);
    return NextResponse.json({ result });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
