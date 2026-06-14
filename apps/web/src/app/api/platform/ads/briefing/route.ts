import { adsBffPost } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  return adsBffPost(req, "/api/ads-agent/briefing", {
    run_id: "mock_briefing",
    launched: false,
    strategy: { strategy_summary: "Modo demo — servicio no disponible." },
  });
}
