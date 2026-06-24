import { NextResponse } from "next/server";
import {
  getSentimentMonitorService,
  getSaasReputationService,
  getSaasWorkflowService,
  SaasReputationError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapRepErr(e: SaasReputationError) {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "OAUTH_REQUIRED" ? 403 : e.code === "EXTERNAL_ERROR" ? 502 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/**
 * GET /api/saas/reputation?resource=mentions|stats|alerts|reviews
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") ?? "mentions";
    const repSvc = getSaasReputationService();
    const sentSvc = getSentimentMonitorService();
    const gbpConfig = repSvc.getGbpConfig();

    if (resource === "reviews") {
      const rating = searchParams.get("rating") ? parseInt(searchParams.get("rating")!) : undefined;
      const replyStatus = (searchParams.get("reply_status") ?? undefined) as "pending" | "replied" | "ignored" | undefined;
      const [reviews, stats] = await Promise.all([
        repSvc.listReviews(ctx.tenant.id, { rating, replyStatus }),
        repSvc.getStats(ctx.tenant.id),
      ]);
      return NextResponse.json({ reviews, stats, gbp_config: gbpConfig });
    }

    if (resource === "stats") {
      const stats = await sentSvc.getStats(ctx.tenant.id, "30d");
      return NextResponse.json({ stats, gbp_config: gbpConfig });
    }

    if (resource === "alerts") {
      const alerts = await sentSvc.getActiveAlerts(ctx.tenant.id);
      return NextResponse.json({ alerts, gbp_config: gbpConfig });
    }

    // Default: mentions
    const result = await sentSvc.getMentions(ctx.tenant.id, {
      pageSize: 50,
      channel: searchParams.get("channel") ?? undefined,
      label: (searchParams.get("label") as "positive" | "neutral" | "negative") ?? undefined,
    });

    return NextResponse.json({
      mentions: result.items,
      total: result.total,
      gbp_config: gbpConfig,
      gbp_message: gbpConfig.placesConfigured ? null : "Configura GOOGLE_PLACES_API_KEY + GBP_PLACE_ID en Railway para sincronizar reseñas de Google.",
    });
  } catch (e: unknown) {
    if (e instanceof SaasReputationError) return mapRepErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/**
 * POST /api/saas/reputation
 * body: { action: "sync" | "check_alerts" | "reply" | "ignore" }
 * reply: also needs { review_id, comment }
 * ignore: also needs { review_id }
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = typeof b.action === "string" ? b.action : "check_alerts";
    const repSvc = getSaasReputationService();

    if (action === "sync") {
      const wfSvc = getSaasWorkflowService();
      const result = await repSvc.syncGbpReviews(ctx.tenant.id, async (triggerData) => {
        await wfSvc.dispatchActiveWorkflows(ctx.tenant.id, "review_received", triggerData);
      });
      return NextResponse.json({ result });
    }

    if (action === "reply") {
      const reviewId = typeof b.review_id === "string" ? b.review_id : "";
      const comment = typeof b.comment === "string" ? b.comment : "";
      if (!reviewId) return NextResponse.json({ error: "review_id required" }, { status: 400 });
      const review = await repSvc.replyToReview(ctx.tenant.id, reviewId, comment);
      return NextResponse.json({ review });
    }

    if (action === "ignore") {
      const reviewId = typeof b.review_id === "string" ? b.review_id : "";
      if (!reviewId) return NextResponse.json({ error: "review_id required" }, { status: 400 });
      const review = await repSvc.markIgnored(ctx.tenant.id, reviewId);
      return NextResponse.json({ review });
    }

    // Default: check_alerts (backward compat)
    const result = await getSentimentMonitorService().checkAlerts(ctx.tenant.id);
    return NextResponse.json({ result });
  } catch (e: unknown) {
    if (e instanceof SaasReputationError) return mapRepErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
