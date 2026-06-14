import { NextResponse } from "next/server";

import { authenticatePlatformRequest, readJsonBody } from "@/lib/platformBffRoute";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { EMPTY_STORE, ecommerceBffGet } from "@/lib/ecommerceBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  return ecommerceBffGet(req, `/api/os/store/projects/${id}`, EMPTY_STORE);
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const authError = await authenticatePlatformRequest(req);
  if (authError) return authError;

  let body: unknown = {};
  try {
    body = await readJsonBody(req);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await proxyPlatformFetch(req, "PUT", `/api/os/store/projects/${id}`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const text = await upstream.text();
    if (upstream.ok) {
      return NextResponse.json(text ? JSON.parse(text) : {});
    }
    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json(EMPTY_STORE, { status: upstream.status >= 500 ? 503 : upstream.status });
    }
  } catch {
    return NextResponse.json(EMPTY_STORE, { status: 503 });
  }
}
