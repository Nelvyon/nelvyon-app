import { socialBffGet } from "@/lib/socialBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY_MODULE = {
  module: "social",
  period: "30d",
  kpis: {},
  charts: {},
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "30d";
  return socialBffGet(req, `/api/v1/analytics/social?period=${period}`, EMPTY_MODULE);
}
