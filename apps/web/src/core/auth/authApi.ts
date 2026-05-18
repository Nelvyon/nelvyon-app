import type { AuthMeResponse } from "@/core/auth/mapSession";
import type { WorkspaceRow } from "@/features/workspace/types";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
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
