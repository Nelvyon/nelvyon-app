/**
 * GET /api/public/funnel/[slug]/step/[order]?session=<sid>
 * Returns step content with optional A/B variant selection.
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

type RouteCtx = { params: Promise<{ slug: string; order: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkLimit(ip)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { slug, order } = await ctx.params;
  const stepOrder = parseInt(order, 10);
  if (isNaN(stepOrder) || stepOrder < 1) return NextResponse.json({ error: "Invalid step order" }, { status: 400 });

  const sessionId = new URL(req.url).searchParams.get("session") ?? "";

  try {
    const svc = getSaasFunnelService();
    const funnel = await svc.getByPublicSlug(slug);
    if (!funnel) return NextResponse.json({ error: "Funnel not found" }, { status: 404 });

    const step = funnel.steps.find(s => s.stepOrder === stepOrder - 1) ?? funnel.steps[stepOrder - 1];
    if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    const selectedVariant = sessionId ? await svc.pickVariant(step.id, sessionId) : null;

    return NextResponse.json({
      stepOrder,
      totalSteps: funnel.steps.length,
      step: {
        id: step.id,
        type: step.type,
        name: step.name,
        content: selectedVariant?.content.html ?? step.content,
        ctaLabel: (selectedVariant?.content.ctaLabel as string | undefined) ?? step.ctaLabel,
        ctaUrl: (selectedVariant?.content.ctaUrl as string | undefined) ?? step.ctaUrl,
      },
      variant: selectedVariant ? { key: selectedVariant.variantKey, id: selectedVariant.id } : null,
      nextStepUrl: stepOrder < funnel.steps.length ? `/f/${slug}/step/${stepOrder + 1}` : null,
      isLast: stepOrder >= funnel.steps.length,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
