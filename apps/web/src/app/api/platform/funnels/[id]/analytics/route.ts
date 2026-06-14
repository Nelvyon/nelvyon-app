import { EMPTY_FUNNEL_ANALYTICS, funnelsBffGet } from "@/lib/funnelsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return funnelsBffGet(req, `/api/funnels/${id}/analytics`, EMPTY_FUNNEL_ANALYTICS);
}
