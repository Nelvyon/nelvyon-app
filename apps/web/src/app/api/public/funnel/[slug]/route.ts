/**
 * GET /api/public/funnel/[slug]
 * Returns active funnel + steps. No tenant secrets exposed.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasFunnelService } from "@nelvyon/saas";

const ipCounts = new Map<string, { n: number; resetAt: number }>();
function checkLimit(ip: string): boolean {
  const now = Date.now();
  const e = ipCounts.get(ip);
  if (!e || e.resetAt < now) { ipCounts.set(ip, { n: 1, resetAt: now + 60_000 }); return true; }
  e.n++;
  return e.n <= 120;
}

type RouteCtx = { params: Promise<{ slug: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkLimit(ip)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { slug } = await ctx.params;
  if (!slug?.trim()) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const funnel = await getSaasFunnelService().getByPublicSlug(slug);
    if (!funnel) return NextResponse.json({ error: "Funnel not found" }, { status: 404 });

    return NextResponse.json({
      id: funnel.id,
      name: funnel.name,
      description: funnel.description,
      publicSlug: funnel.publicSlug,
      steps: funnel.steps.map(s => ({
        id: s.id,
        stepOrder: s.stepOrder,
        type: s.type,
        name: s.name,
        content: s.content,
        ctaLabel: s.ctaLabel,
        ctaUrl: s.ctaUrl,
      })),
      totalSteps: funnel.steps.length,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
