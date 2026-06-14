import { adsBffGet, EMPTY_UNIFIED_REPORTING } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return adsBffGet(req, "/api/ads-agent/reporting/unified", EMPTY_UNIFIED_REPORTING);
}
