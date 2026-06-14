import { EMPTY_FUNNELS_LIST, funnelsBffGet, funnelsBffPost } from "@/lib/funnelsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return funnelsBffGet(req, "/api/funnels", EMPTY_FUNNELS_LIST);
}

export async function POST(req: Request) {
  return funnelsBffPost(req, "/api/funnels", {
    id: "mock-funnel",
    name: "Funnel demo",
    status: "draft",
    steps: [],
  });
}
