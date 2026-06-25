/**
 * GET /api/public/site/[subdomain]/[slug]
 * Returns published_html snapshot as text/html + records a view.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasWebBuilderService } from "@nelvyon/saas";

const ipCounts = new Map<string, { n: number; resetAt: number }>();
function checkLimit(ip: string): boolean {
  const now = Date.now();
  const e = ipCounts.get(ip);
  if (!e || e.resetAt < now) { ipCounts.set(ip, { n: 1, resetAt: now + 60_000 }); return true; }
  e.n++;
  return e.n <= 120;
}

type RouteCtx = { params: Promise<{ subdomain: string; slug: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkLimit(ip)) return new NextResponse("Rate limit exceeded", { status: 429 });

  const { subdomain, slug } = await ctx.params;
  if (!subdomain?.trim() || !slug?.trim()) return new NextResponse("Not found", { status: 404 });

  try {
    const svc = getSaasWebBuilderService();
    const page = await svc.getPublicPage(subdomain, slug);
    if (!page) return new NextResponse("Not found", { status: 404 });

    // Record view async (non-blocking)
    void svc.recordView(subdomain, slug);

    const html = page.publishedHtml ?? svc.renderHtml(page);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  } catch {
    return new NextResponse("Internal error", { status: 500 });
  }
}
