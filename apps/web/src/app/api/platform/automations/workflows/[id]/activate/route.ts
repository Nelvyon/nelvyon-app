import { automationsBffPost } from "@/lib/automationsBffRoute";

const EMPTY_WORKFLOW = { id: 0, name: "", status: "draft" };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  return automationsBffPost(req, `/api/workflows/${id}/activate`, EMPTY_WORKFLOW);
}
