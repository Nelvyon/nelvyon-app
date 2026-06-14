import { adsBffGet, EMPTY_CAMPAIGNS } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return adsBffGet(req, "/api/google-ads/campaigns", EMPTY_CAMPAIGNS);
}
