import { NextResponse } from "next/server";
import {
  getSaasSeoService,
  SaasSeoError,
  isSemrushConfigured,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function emptySummary(keywordCount: number) {
  return {
    totalKeywords: keywordCount,
    avgPosition: null as number | null,
    totalTraffic: 0,
    errors: 0,
    warnings: 0,
    info: 0,
  };
}

/**
 * GET /api/saas/seo — keywords rastreadas (DB) + enriquecimiento SEMrush opcional.
 * POST /api/saas/seo — añadir keyword(s) a rastrear (no requiere SEMrush).
 * DELETE /api/saas/seo?id= — eliminar keyword rastreada.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasSeoService();
    const semrushReady = isSemrushConfigured();

    let tracked = await svc.listTracked(ctx.tenant.id);
    let semrushDegraded = false;
    let semrushError: string | undefined;

    if (semrushReady && tracked.length > 0) {
      const enriched = await svc.enrichTrackedFromSemrush(ctx.tenant.id);
      tracked = enriched.keywords;
      if (enriched.error) {
        semrushDegraded = true;
        semrushError = enriched.error;
      }
    }

    let semrushKeywords = tracked;
    let avgPosition: number | null = null;
    let totalTraffic = 0;

    if (semrushReady) {
      const live = await svc.fetchSemrushDomainKeywords();
      if (live.error) {
        semrushDegraded = true;
        semrushError = live.error;
      } else {
        semrushKeywords = svc.mergeKeywords(tracked, live.keywords);
        avgPosition = live.avgPosition;
        totalTraffic = live.totalTraffic;
      }
    }

    const positions = semrushKeywords.filter((k) => k.position > 0).map((k) => k.position);
    const computedAvg =
      avgPosition ??
      (positions.length > 0 ? Math.round(positions.reduce((s, p) => s + p, 0) / positions.length) : null);

    return NextResponse.json({
      configured: semrushReady && !semrushDegraded,
      trackingEnabled: true,
      degraded: semrushDegraded,
      message: !semrushReady
        ? "Configura SEMRUSH_API_KEY y SEO_DOMAIN para posiciones en vivo. Puedes añadir keywords manualmente."
        : semrushDegraded
          ? semrushError
          : undefined,
      error: semrushDegraded ? semrushError : undefined,
      keywords: semrushKeywords,
      issues: [],
      summary: {
        ...emptySummary(semrushKeywords.length),
        avgPosition: computedAvg,
        totalTraffic,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    const rawKeywords = Array.isArray(b.keywords)
      ? b.keywords.filter((k): k is string => typeof k === "string")
      : typeof b.keyword === "string"
        ? [b.keyword]
        : [];
    const keywords = rawKeywords.map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) return NextResponse.json({ error: "keyword is required" }, { status: 400 });

    const domain = typeof b.domain === "string" ? b.domain : undefined;
    const saved = await getSaasSeoService().addManyTracked(ctx.tenant.id, keywords, domain);
    return NextResponse.json({ keywords: saved, trackingEnabled: true }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasSeoError) {
      const status = e.code === "NOT_MIGRATED" ? 503 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await getSaasSeoService().removeTracked(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasSeoError) {
      const status =
        e.code === "NOT_MIGRATED" ? 503 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
