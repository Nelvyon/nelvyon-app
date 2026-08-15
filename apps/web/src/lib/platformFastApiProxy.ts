import { extractToken, authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { WorkspaceRow } from "@/features/workspace/types";
import {
  assertUserCanAccessWorkspace,
  WorkspaceAccessError,
} from "@/lib/platformDbFallback";
import { bffDegraded, BFF_DEGRADED_UPSTREAM } from "@/lib/bffDegraded";

export function platformApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.PYTHON_BACKEND_URL?.trim() ||
    "http://127.0.0.1:8000"
  );
}

export function stableWorkspaceIdFromTenant(tenantId: string): number {
  const src = (tenantId ?? "").trim();
  if (!src) {
    throw new Error("tenantId is required for workspace id derivation");
  }
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

export const EMPTY_CLIENT_LIST = bffDegraded(
  {
    items: [] as unknown[],
    total: 0,
    skip: 0,
    limit: 20,
  },
  BFF_DEGRADED_UPSTREAM,
);

export const EMPTY_PIPELINE = bffDegraded(
  {
    by_stage: [] as unknown[],
    items: [] as unknown[],
    stages: [] as unknown[],
    total_count: 0,
    total_value: 0,
  },
  BFF_DEGRADED_UPSTREAM,
);

export async function readSessionToken(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  return extractToken(req);
}

/**
 * Estricto a proposito: solo digitos ASCII, sin signo, sin separadores.
 *
 * `Number()` acepta cosas que Python rechaza (`"1e0"`, `"0x2"`, `"2.0"`) y
 * —peor— rechaza cosas que Python acepta: `Number("1_0")` es `NaN`, pero
 * `int("1_0")` es `10`. Con el parser laxo, una cabecera que este lado no
 * entendia se trataba como "sin workspace" y la comprobacion de pertenencia se
 * saltaba entera, mientras FastAPI si resolvia un workspace. Los dos extremos
 * tienen que leer el mismo numero o ninguno.
 */
export function parsePlatformWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  if (!/^[0-9]+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Hay cabecera, pero no es un identificador que ambos lados lean igual. */
export function hasUnparsableWorkspaceHeader(req: Request): boolean {
  const raw = req.headers.get("x-workspace-id")?.trim();
  return Boolean(raw) && parsePlatformWorkspaceId(req) === null;
}

export type PlatformProxyOptions = {
  /** Entity routes must bind to a workspace before upstream proxy (IDOR defense). */
  requireWorkspace?: boolean;
};

export async function proxyPlatformFetch(
  req: Request,
  method: string,
  path: string,
  init: RequestInit = {},
  options: PlatformProxyOptions = {},
): Promise<Response> {
  const token = await readSessionToken(req);
  if (!token) {
    return new Response(JSON.stringify({ detail: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const wsNum = parsePlatformWorkspaceId(req);

  // Una cabecera presente que este lado no sabe leer se RECHAZA; antes se
  // trataba como ausente, lo que hacia que la comprobacion de pertenencia de
  // mas abajo no llegase a ejecutarse mientras FastAPI si resolvia workspace.
  if (hasUnparsableWorkspaceHeader(req)) {
    return new Response(JSON.stringify({ error: "Invalid X-Workspace-Id header" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (options.requireWorkspace && !wsNum) {
    return new Response(JSON.stringify({ error: "X-Workspace-Id header required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (wsNum) {
    try {
      const claims = await authenticate(req);
      await assertUserCanAccessWorkspace(claims, wsNum);
    } catch (e) {
      if (e instanceof WorkspaceAccessError) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (e instanceof OsAgentError && e.message === "Unauthorized") {
        return new Response(JSON.stringify({ detail: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw e;
    }
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  // Se reenvia el valor CANONICO, no el original: si se pasa el string crudo,
  // FastAPI puede interpretarlo como un workspace distinto del que se acaba de
  // comprobar aqui.
  if (wsNum) headers.set("X-Workspace-Id", String(wsNum));

  return fetch(`${platformApiBase()}${path}`, {
    ...init,
    method,
    headers,
    cache: "no-store",
  });
}
