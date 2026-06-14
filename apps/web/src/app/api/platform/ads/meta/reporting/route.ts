import { adsBffGet, EMPTY_REPORTING } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return adsBffGet(req, "/api/meta-ads/reporting", EMPTY_REPORTING);
}
