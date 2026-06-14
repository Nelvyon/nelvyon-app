import { adsBffGet, EMPTY_ROAS_ALERTS } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const threshold = url.searchParams.get("threshold") ?? "1.5";
  return adsBffGet(req, `/api/ads-agent/alerts/roas?threshold=${threshold}`, EMPTY_ROAS_ALERTS);
}
