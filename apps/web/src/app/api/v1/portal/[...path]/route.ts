import { NextResponse } from "next/server";
import { subrutaDeProxy } from "@/lib/security/subrutaDeProxy";
import { proxyPortalFetch } from "@/lib/portalFastApiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  // Ver `subrutaDeProxy`: los segmentos llegan decodificados y un `..` sale de
  // la familia de endpoints que este proxy debe servir.
  let subpath: string;
  try {
    subpath = subrutaDeProxy(path);
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  return proxyPortalFetch(req, subpath);
}

export async function GET(req: Request, ctx: RouteContext) {
  return handle(req, ctx);
}

export async function POST(req: Request, ctx: RouteContext) {
  return handle(req, ctx);
}

export async function PUT(req: Request, ctx: RouteContext) {
  return handle(req, ctx);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  return handle(req, ctx);
}

export async function DELETE(req: Request, ctx: RouteContext) {
  return handle(req, ctx);
}
