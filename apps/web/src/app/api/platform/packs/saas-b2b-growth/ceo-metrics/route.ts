import { NextResponse } from "next/server";

import { fetchSaasB2bCeoMetrics } from "@/lib/packs/saasB2bPackCeoMetrics";
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
  const campaignRaw = url.searchParams.get("campaign_id");
  const campaignId = campaignRaw ? Number(campaignRaw) : null;
  const nurtureStatus = url.searchParams.get("nurture_status")?.trim() || undefined;
  const nurtureTouchesRaw = url.searchParams.get("nurture_touches");
  const nurtureTouches = nurtureTouchesRaw ? Number(nurtureTouchesRaw) : undefined;

  const metrics = await fetchSaasB2bCeoMetrics({
    req,
    workspaceId,
    userId: claims.userId,
    campaignId: Number.isFinite(campaignId) && campaignId! > 0 ? campaignId : null,
    nurtureFallback:
      nurtureStatus || nurtureTouches != null
        ? { status: nurtureStatus, touches: nurtureTouches }
        : undefined,
  });

  return NextResponse.json(metrics);
}
