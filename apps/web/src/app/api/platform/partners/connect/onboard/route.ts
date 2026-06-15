import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { startPartnerConnectOnboarding } from "@/lib/partners/partnerConnectService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }

  const email = claims.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email de partner no encontrado en sesión" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/dashboard/partners?connect=return`;
  const refreshUrl = `${origin}/dashboard/partners?connect=refresh`;

  try {
    const result = await startPartnerConnectOnboarding({
      workspaceId,
      userId: claims.userId,
      email,
      returnUrl,
      refreshUrl,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Onboarding failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
