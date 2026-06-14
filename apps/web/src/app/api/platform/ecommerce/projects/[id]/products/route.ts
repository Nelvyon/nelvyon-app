import { ecommerceBffPost } from "@/lib/ecommerceBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  return ecommerceBffPost(req, `/api/os/store/projects/${id}/products`, { id: "mock-product" });
}
