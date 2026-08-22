import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformBffAuth";
import { TODA_LA_CACHE, getOsAgentDataService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformAdmin(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const svc = getOsAgentDataService();
    // Vista GLOBAL, deliberada: `requirePlatformAdmin` devuelve 403 a quien no
    // sea administrador de plataforma. Escrita, no obtenida por omision.
    const [summary, recent] = await Promise.all([
      svc.getSummary(TODA_LA_CACHE), svc.listRecent(TODA_LA_CACHE, 50)]);
    return NextResponse.json({
      summary,
      recent,
      integrations: { semrush: summary.semrushIntegrations, dataforseo: summary.dataforseoConfigured },
    });
  } catch (e) {
    console.error("[os/agent-data GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
