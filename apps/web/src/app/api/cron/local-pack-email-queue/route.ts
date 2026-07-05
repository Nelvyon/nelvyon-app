import { NextRequest, NextResponse } from "next/server";

import { processPendingLocalWelcomeEmails } from "@/lib/packs/localPackWelcomeEmail";
import { verifyCronHeader } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = verifyCronHeader(req.headers.get("x-cron-secret"));
  if (denied) return denied;

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;
  const workspaceIdRaw = req.nextUrl.searchParams.get("workspace_id");
  const workspaceId = workspaceIdRaw ? Number(workspaceIdRaw) : undefined;
  const result = await processPendingLocalWelcomeEmails({
    limit,
    workspaceId: workspaceId && Number.isFinite(workspaceId) ? workspaceId : undefined,
  });

  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
    ...result,
  });
}
