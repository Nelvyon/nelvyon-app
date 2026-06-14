import { EMPTY_STORES_LIST, ecommerceBffGet, ecommerceBffPost } from "@/lib/ecommerceBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return ecommerceBffGet(req, "/api/os/store/projects", EMPTY_STORES_LIST);
}

export async function POST(req: Request) {
  return ecommerceBffPost(req, "/api/os/store/projects", EMPTY_STORES_LIST);
}
