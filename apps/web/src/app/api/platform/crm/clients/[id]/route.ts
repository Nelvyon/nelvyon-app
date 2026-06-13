import { forwardPlatformJson, readJsonBody } from "@/lib/platformBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const entityPath = (id: string) => `/api/v1/entities/nelvyon_clients/${id}`;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return forwardPlatformJson(req, "GET", entityPath(id));
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJsonBody(req);
  return forwardPlatformJson(req, "PUT", entityPath(id), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}
