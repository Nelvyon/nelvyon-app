import { extractToken } from "@nelvyon/auth";
import type { WorkspaceRow } from "@/features/workspace/types";

export function platformApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.PYTHON_BACKEND_URL?.trim() ||
    "http://127.0.0.1:8000"
  );
}

export function stableWorkspaceIdFromTenant(tenantId: string): number {
  const src = (tenantId ?? "").trim() || "default-tenant";
  let hash = 0;
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
  }
  return (hash % 900_000) + 1_000;
}

/** Fallback when FastAPI workspace bootstrap is unavailable (staging DB / CORS). */
export function fallbackWorkspaceList(claims: {
  userId: string;
  tenantId: string;
  plan?: string;
}): WorkspaceRow[] {
  const id = stableWorkspaceIdFromTenant(claims.tenantId);
  const role = claims.plan === "agency" || claims.plan === "enterprise" ? "admin" : "member";
  return [
    {
      id,
      name: "Mi Workspace",
      slug: "default",
      logo_url: null,
      primary_color: null,
      domain: null,
      plan: claims.plan ?? "starter",
      status: "active",
      role,
      members_count: 1,
      created_at: null,
    },
  ];
}

export const EMPTY_CLIENT_LIST = {
  items: [] as unknown[],
  total: 0,
  skip: 0,
  limit: 20,
};

export async function readSessionToken(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  return extractToken(req);
}

export async function proxyPlatformFetch(
  req: Request,
  method: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await readSessionToken(req);
  if (!token) {
    return new Response(JSON.stringify({ detail: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  const workspaceId = req.headers.get("x-workspace-id");
  if (workspaceId) headers.set("X-Workspace-Id", workspaceId);

  return fetch(`${platformApiBase()}${path}`, {
    ...init,
    method,
    headers,
    cache: "no-store",
  });
}
