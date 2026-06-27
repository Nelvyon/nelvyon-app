import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsAgentDataService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { domain, queryTypes?, database? } — fetch + cache SEO data for a domain. */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;
  const userId = (claims as { userId?: string }).userId;

  try {
    const body = (await req.json().catch(() => ({}))) as { domain?: string; queryTypes?: string[]; database?: string };
    if (!body.domain?.trim()) {
      return NextResponse.json({ error: "domain requerido", code: "VALIDATION" }, { status: 400 });
    }
    const types = body.queryTypes?.length ? body.queryTypes : ["keywords", "competitors"];
    const svc = getOsAgentDataService();
    const counts: Record<string, number> = {};
    let provider: string = "none";

    if (types.includes("keywords")) {
      const snap = await svc.fetchKeywordSnapshot({ userId, domain: body.domain, database: body.database });
      counts.keywords = snap.keywords.length;
      provider = snap.provider;
    }
    if (types.includes("competitors")) {
      const snap = await svc.fetchCompetitorSnapshot({ userId, domain: body.domain, database: body.database });
      counts.competitors = snap.competitors.length;
      if (provider === "none") provider = snap.provider;
    }

    return NextResponse.json({ cached: true, provider, counts });
  } catch (e) {
    console.error("[os/agent-data/refresh POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
