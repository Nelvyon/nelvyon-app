import { NextResponse } from "next/server";

import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

const UPSTREAM_UNAVAILABLE = {
  error: "Servicio temporalmente no disponible. Inténtalo de nuevo en unos minutos.",
};

export async function authenticatePlatformRequest(req: Request): Promise<NextResponse | null> {
  try {
    await authenticate(req);
    return null;
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(UPSTREAM_UNAVAILABLE, { status: 503 });
  }
}

export async function forwardPlatformJson(
  req: Request,
  method: string,
  upstreamPath: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const authError = await authenticatePlatformRequest(req);
  if (authError) return authError;

  const upstream = await proxyPlatformFetch(req, method, upstreamPath, init);
  const text = await upstream.text();

  if (upstream.ok) {
    if (!text) return NextResponse.json({});
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
      });
    }
  }

  if (upstream.status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (upstream.status === 403) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (upstream.status === 404) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    return NextResponse.json(JSON.parse(text), { status: upstream.status });
  } catch {
    return NextResponse.json(UPSTREAM_UNAVAILABLE, {
      status: upstream.status >= 500 ? 503 : upstream.status,
    });
  }
}

export async function readJsonBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}
