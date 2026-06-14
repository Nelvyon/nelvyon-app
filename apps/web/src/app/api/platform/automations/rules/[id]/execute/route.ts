import { automationsBffPost } from "@/lib/automationsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  return automationsBffPost(req, `/api/v1/workflow-engine/execute/${id}`, {
    rule_id: Number(id),
    status: "ok",
  });
}
