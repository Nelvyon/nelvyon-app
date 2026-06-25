/**
 * POST /api/public/funnel/[slug]/event
 * Body: { eventType, stepId?, sessionId?, variantKey? }
 * Records a funnel event (visit, conversion, checkout_start, checkout_complete).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasFunnelService, type FunnelEventType } from "@nelvyon/saas";

const ipCounts = new Map<string, { n: number; resetAt: number }>();
function checkLimit(ip: string): boolean {
  const now = Date.now();
  const e = ipCounts.get(ip);
  if (!e || e.resetAt < now) { ipCounts.set(ip, { n: 1, resetAt: now + 60_000 }); return true; }
  e.n++;
  return e.n <= 180;
}

const VALID_EVENT_TYPES: FunnelEventType[] = ["visit", "conversion", "checkout_start", "checkout_complete"];

type RouteCtx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkLimit(ip)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { slug } = await ctx.params;
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const eventType = String(body.eventType ?? "") as FunnelEventType;
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: `eventType must be one of: ${VALID_EVENT_TYPES.join(", ")}` }, { status: 400 });
  }

  try {
    const svc = getSaasFunnelService();
    const funnel = await svc.getByPublicSlug(slug);
    if (!funnel) return NextResponse.json({ error: "Funnel not found" }, { status: 404 });

    await svc.recordEvent(funnel.tenantId, {
      funnelId: funnel.id,
      stepId: typeof body.stepId === "string" ? body.stepId : null,
      variantKey: typeof body.variantKey === "string" ? body.variantKey : null,
      eventType,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
      metadata: typeof body.metadata === "object" && body.metadata !== null
        ? (body.metadata as Record<string, unknown>) : {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
