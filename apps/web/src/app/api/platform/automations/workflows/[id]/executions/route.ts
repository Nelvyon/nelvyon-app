import { automationsBffGet } from "@/lib/automationsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPTY = { items: [] as unknown[], total: 0 };

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  return automationsBffGet(req, `/api/workflows/${id}/executions`, EMPTY);
}
