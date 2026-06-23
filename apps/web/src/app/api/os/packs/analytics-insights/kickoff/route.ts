import { NextResponse } from "next/server";

import {
  runAnalyticsInsightsPack,
  validateAnalyticsInsightsIntake,
} from "@/lib/packs/analyticsInsightsPack";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  if (!platformDbFallbackEnabled()) {
    return NextResponse.json(
      { error: "Analytics Insights requiere DATABASE_URL en el entorno web" },
      { status: 503 },
    );
  }

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id header required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intake = validateAnalyticsInsightsIntake(body);
  if (!intake) {
    return NextResponse.json(
      { error: "Brief inválido. Indica business_name (nombre del proyecto)." },
      { status: 400 },
    );
  }

  try {
    const run = await runAnalyticsInsightsPack({
      workspaceId,
      userId: claims.userId,
      intake,
    });
    return NextResponse.json(run, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Analytics pack execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
