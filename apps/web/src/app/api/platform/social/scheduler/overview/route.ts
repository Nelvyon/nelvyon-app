import { EMPTY_SOCIAL_SCHEDULER, socialBffGet } from "@/lib/socialBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return socialBffGet(req, "/api/social/stats/overview", EMPTY_SOCIAL_SCHEDULER);
}
