import { EMPTY_SOCIAL_PUBLISH, socialBffGet } from "@/lib/socialBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id") ?? "ws-client-1";
  return socialBffGet(req, `/api/social-publish/analytics/${clientId}`, EMPTY_SOCIAL_PUBLISH);
}
