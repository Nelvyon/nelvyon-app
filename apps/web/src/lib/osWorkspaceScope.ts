import { NextResponse } from "next/server";

import type { JwtPayload } from "@nelvyon/auth";

import { getPackRun } from "@/lib/packs/packRunStore";
import { assertUserCanAccessWorkspace, WorkspaceAccessError } from "@/lib/platformDbFallback";

export function parseWorkspaceHeader(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Requires X-Workspace-Id and active membership (OS BFF routes). */
export async function requireOsWorkspaceAccess(
  req: Request,
  claims: JwtPayload,
): Promise<{ workspaceId: number } | NextResponse> {
  const workspaceId = parseWorkspaceHeader(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id header required" }, { status: 400 });
  }
  try {
    await assertUserCanAccessWorkspace(claims, workspaceId);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
  return { workspaceId };
}

export async function packRunBelongsToWorkspace(packRunId: string, workspaceId: number): Promise<boolean> {
  const run = await getPackRun(packRunId);
  return !!run && run.workspace_id === workspaceId;
}

export function notFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
