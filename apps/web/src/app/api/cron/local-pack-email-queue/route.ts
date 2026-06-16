import { NextRequest, NextResponse } from "next/server";

import { processPendingLocalWelcomeEmails } from "@/lib/packs/localPackWelcomeEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  const workspaceIdRaw = req.nextUrl.searchParams.get("workspace_id");
  const workspaceId = workspaceIdRaw ? Number(workspaceIdRaw) : undefined;
  const result = await processPendingLocalWelcomeEmails({
    limit: Number.isFinite(limit) ? limit : 100,
    workspaceId: Number.isFinite(workspaceId as number) ? workspaceId : undefined,
  });

  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
    ...result,
  });
}
