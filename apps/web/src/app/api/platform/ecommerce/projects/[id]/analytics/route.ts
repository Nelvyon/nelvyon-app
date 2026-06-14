import { EMPTY_STORE_ANALYTICS, ecommerceBffGet } from "@/lib/ecommerceBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  return ecommerceBffGet(req, `/api/os/store/projects/${id}/analytics`, EMPTY_STORE_ANALYTICS);
}
