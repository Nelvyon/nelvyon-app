import { adsBffPost } from "@/lib/adsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // adsBffPost ignores fallback (fail-closed 502 on upstream failure) — no silent mock payload.
  return adsBffPost(req, "/api/ads-agent/briefing");
}
