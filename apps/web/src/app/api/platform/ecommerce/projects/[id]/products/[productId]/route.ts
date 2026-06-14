import { NextResponse } from "next/server";

import { authenticatePlatformRequest } from "@/lib/platformBffRoute";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string; productId: string }> };

export async function DELETE(req: Request, ctx: RouteCtx) {
  const { id, productId } = await ctx.params;
  const authError = await authenticatePlatformRequest(req);
  if (authError) return authError;

  try {
    const upstream = await proxyPlatformFetch(
      req,
      "DELETE",
      `/api/os/store/projects/${id}/products/${productId}`,
    );
    if (upstream.ok) {
      return NextResponse.json({ deleted: true });
    }
    return NextResponse.json({ deleted: false }, { status: upstream.status });
  } catch {
    return NextResponse.json({ deleted: false }, { status: 503 });
  }
}
