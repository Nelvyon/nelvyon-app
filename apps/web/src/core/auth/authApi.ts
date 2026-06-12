import type { AuthMeResponse } from "@/core/auth/mapSession";
import type { WorkspaceRow } from "@/features/workspace/types";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
}

export interface NelvyonAuthMeResponse {
  userId: string;
  email: string;
  tenantId: string;
  plan: string;
  fullName: string;
}

/** Validate nelvyon JWT via Next.js (same secret as /api/auth/login). */
export async function fetchNelvyonAuthMe(accessToken: string): Promise<NelvyonAuthMeResponse> {
  const res = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as NelvyonAuthMeResponse;
}

/** Cookie-only session: retrieve Bearer token for FastAPI from HttpOnly cookie. */
export async function fetchNelvyonTokenFromCookie(): Promise<string | null> {
  const res = await fetch("/api/auth/token", { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { token?: unknown };
  return typeof data.token === "string" ? data.token : null;
}

/** Bootstrap-friendly: does not rely on `apiClient` token provider being set yet. */
export async function fetchAuthMe(accessToken: string): Promise<AuthMeResponse> {
  const res = await fetch(`${apiBase()}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as AuthMeResponse;
}

export async function fetchWorkspaceList(accessToken: string): Promise<WorkspaceRow[]> {
  const res = await fetch(`${apiBase()}/api/v1/workspace/list`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as WorkspaceRow[];
}

/** FastAPI workspace list — accepts nelvyon JWT after backend bridge (core/nelvyon_jwt.py). */
export async function fetchPlatformWorkspaces(accessToken: string): Promise<WorkspaceRow[]> {
  return fetchWorkspaceList(accessToken);
}
