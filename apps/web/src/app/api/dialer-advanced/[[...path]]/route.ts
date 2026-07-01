import { NextResponse } from "next/server";

import { extractToken } from "@nelvyon/auth";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

import { platformApiBase, stableWorkspaceIdFromTenant } from "@/lib/platformFastApiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ path?: string[] }> };

async function proxyDialerAdvanced(req: Request, pathSegments: string[] | undefined) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const token = await extractToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subpath = (pathSegments ?? []).join("/");
    const url = new URL(req.url);
    const target = `${platformApiBase()}/api/dialer-advanced/${subpath}${url.search}`;

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    headers.set("X-Workspace-Id", String(stableWorkspaceIdFromTenant(ctx.tenant.id)));
    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);

    const init: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.text();
    }

    const backendRes = await fetch(target, init);
    const body = await backendRes.text();
    return new NextResponse(body, {
      status: backendRes.status,
      headers: {
        "Content-Type": backendRes.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    const status = saasErrorStatus(err);
    return NextResponse.json(saasErrorBody(err), { status });
  }
}

export async function GET(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyDialerAdvanced(req, path);
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyDialerAdvanced(req, path);
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyDialerAdvanced(req, path);
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyDialerAdvanced(req, path);
}
