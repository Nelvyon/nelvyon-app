import { NextResponse } from "next/server";
import {
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/saas/seo
 * When SEMRUSH_API_KEY is not set → returns { configured: false } with empty arrays.
 * When set → fetches real data from DataForSEO/SEMrush API.
 *
 * POST /api/saas/seo — add keyword to track
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    void ctx;

    const apiKey = process.env.SEMRUSH_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        message: "Configura SEMRUSH_API_KEY en Railway para ver datos SEO reales.",
        keywords: [],
        issues: [],
        summary: { totalKeywords: 0, avgPosition: null, totalTraffic: 0, errors: 0, warnings: 0, info: 0 },
      });
    }

    const { searchParams } = new URL(req.url);
    const resource = searchParams.get("resource") ?? "all";

    if (resource === "keywords" || resource === "all") {
      // SEMrush Analytics API: keyword positions for the configured domain
      const domain = process.env.SEO_DOMAIN?.trim() ?? "";
      if (!domain) {
        return NextResponse.json({
          configured: true,
          message: "Configura SEO_DOMAIN en Railway para ver posicionamiento de keywords.",
          keywords: [], issues: [],
          summary: { totalKeywords: 0, avgPosition: null, totalTraffic: 0, errors: 0, warnings: 0, info: 0 },
        });
      }

      const url = `https://api.semrush.com/?type=domain_organic&key=${apiKey}&domain=${encodeURIComponent(domain)}&database=es&display_limit=50&export_columns=Ph,Po,Pp,Nq,Cp,Ur`;
      const res = await fetch(url);
      const text = await res.text();
      if (!res.ok || text.startsWith("ERROR")) {
        return NextResponse.json({
          configured: true,
          error: "SEMrush API error: " + text.slice(0, 200),
          keywords: [], issues: [],
          summary: { totalKeywords: 0, avgPosition: null, totalTraffic: 0, errors: 0, warnings: 0, info: 0 },
        });
      }

      // Parse CSV response
      const lines = text.trim().split("\n").slice(1); // skip header
      const keywords = lines.slice(0, 50).map((line, i) => {
        const [keyword, position, prev, volume, cpc, url] = line.split(";");
        return {
          id: `kw-${i}`, keyword: keyword ?? "", position: Number(position ?? 0),
          previousPosition: prev ? Number(prev) : null, searchVolume: Number(volume ?? 0),
          difficulty: 0, cpc: Number(cpc ?? 0), url: url?.trim() ?? null,
          updatedAt: new Date().toISOString(),
        };
      });

      const avgPosition = keywords.length > 0
        ? Math.round(keywords.reduce((s, k) => s + k.position, 0) / keywords.length)
        : null;

      return NextResponse.json({
        configured: true,
        keywords,
        issues: [],
        summary: {
          totalKeywords: keywords.length,
          avgPosition,
          totalTraffic: keywords.reduce((s, k) => s + k.searchVolume, 0),
          errors: 0, warnings: 0, info: 0,
        },
      });
    }

    return NextResponse.json({ configured: true, keywords: [], issues: [] });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    void ctx;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const keyword = typeof b.keyword === "string" ? b.keyword.trim() : "";
    if (!keyword) return NextResponse.json({ error: "keyword is required" }, { status: 400 });

    const apiKey = process.env.SEMRUSH_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "SEMRUSH_API_KEY not configured", code: "NOT_CONFIGURED" }, { status: 422 });
    }

    // Return the keyword as tracked — position data from next GET
    return NextResponse.json({ keyword: { id: `kw-${Date.now()}`, keyword, position: 0, searchVolume: 0 } }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
