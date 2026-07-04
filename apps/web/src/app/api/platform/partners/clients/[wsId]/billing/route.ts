import { NextResponse } from "next/server";

import type { JwtPayload } from "@nelvyon/auth";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  assertUserCanAccessWorkspace,
  WorkspaceAccessError,
} from "@/lib/platformDbFallback";
import { upsertPartnerClientBilling } from "@/lib/partners/partnerConnectStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function assertPartnerWorkspace(req: Request, claims: JwtPayload): Promise<number | NextResponse> {
  const partnerWorkspaceId = parseWorkspaceId(req);
  if (!partnerWorkspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }
  try {
    await assertUserCanAccessWorkspace(claims, partnerWorkspaceId);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
  return partnerWorkspaceId;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ wsId: string }> },
) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const partnerWorkspaceId = await assertPartnerWorkspace(req, claims);
  if (partnerWorkspaceId instanceof NextResponse) return partnerWorkspaceId;

  const { wsId } = await ctx.params;
  const clientWorkspaceId = Number(wsId);
  if (!Number.isFinite(clientWorkspaceId) || clientWorkspaceId <= 0) {
    return NextResponse.json({ error: "Invalid client workspace id" }, { status: 400 });
  }

  const body = (await req.json()) as { retailPlanId?: string; retailEur?: number; clientEmail?: string };
  const retailPlanId = String(body.retailPlanId ?? "starter").trim();
  if (!retailPlanId) {
    return NextResponse.json({ error: "retailPlanId required" }, { status: 400 });
  }

  try {
    const billing = await upsertPartnerClientBilling({
      partnerWorkspaceId,
      clientWorkspaceId,
      retailPlanId,
      retailEur: body.retailEur,
      clientEmail: body.clientEmail,
    });
    return NextResponse.json({ billing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Billing setup failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ wsId: string }> },
) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const partnerWorkspaceId = await assertPartnerWorkspace(req, claims);
  if (partnerWorkspaceId instanceof NextResponse) return partnerWorkspaceId;

  const { wsId } = await ctx.params;
  const clientWorkspaceId = Number(wsId);
  const { getPartnerClientBilling } = await import("@/lib/partners/partnerConnectStore");
  const billing = await getPartnerClientBilling(partnerWorkspaceId, clientWorkspaceId);
  return NextResponse.json({ billing });
}
