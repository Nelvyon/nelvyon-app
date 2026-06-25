/**
 * GET /api/public/site/domain/[host]
 * Resolves a page by verified custom domain and returns its HTML.
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

type RouteCtx = { params: Promise<{ host: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkLimit(ip)) return new NextResponse("Rate limit exceeded", { status: 429 });

  const { host } = await ctx.params;
  if (!host?.trim()) return new NextResponse("Not found", { status: 404 });

  try {
    const svc = getSaasWebBuilderService();
    const page = await svc.getPublicPageByDomain(host);
    if (!page) return new NextResponse("Not found", { status: 404 });

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
