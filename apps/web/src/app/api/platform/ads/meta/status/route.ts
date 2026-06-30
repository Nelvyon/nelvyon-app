import { adsBffGet, EMPTY_PLATFORM_STATUS } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return adsBffGet(req, "/api/meta-ads/status", EMPTY_PLATFORM_STATUS);
}
