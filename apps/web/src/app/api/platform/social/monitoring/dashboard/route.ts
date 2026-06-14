import { EMPTY_SOCIAL_MONITORING, socialBffGet } from "@/lib/socialBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "true" ? "?refresh=true" : "";
  return socialBffGet(req, `/api/social-monitoring/dashboard${refresh}`, EMPTY_SOCIAL_MONITORING);
}
