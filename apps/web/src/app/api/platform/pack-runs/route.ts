import { NextResponse } from "next/server";

import { findLatestPackRunBySaasClient } from "@/lib/packs/packRunStore";
import { requirePlatformClaims } from "@/lib/platformBffAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }

  const url = new URL(req.url);
  const saasClientId = Number(url.searchParams.get("saas_client_id"));
  if (!Number.isFinite(saasClientId) || saasClientId <= 0) {
    return NextResponse.json({ error: "saas_client_id query required" }, { status: 400 });
  }

  const run = await findLatestPackRunBySaasClient(workspaceId, saasClientId);
  return NextResponse.json({ run });
}
