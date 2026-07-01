import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { chargePartnerClientPack } from "@/lib/partners/partnerConnectStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PACK_WHOLESALE: Record<string, number> = {
  local_business_growth: 149,
  ecommerce_growth: 199,
  saas_b2b_growth: 249,
};

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ wsId: string }> },
) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const partnerWorkspaceId = parseWorkspaceId(req);
  if (!partnerWorkspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }

  const { wsId } = await ctx.params;
  const clientWorkspaceId = Number(wsId);
  if (!Number.isFinite(clientWorkspaceId) || clientWorkspaceId <= 0) {
    return NextResponse.json({ error: "Invalid client workspace id" }, { status: 400 });
  }

  const body = (await req.json()) as { packSku?: string; retailEur?: number; clientEmail?: string };
  const packSku = String(body.packSku ?? "").trim();
  if (!packSku) {
    return NextResponse.json({ error: "packSku required" }, { status: 400 });
  }

  const wholesaleEur = PACK_WHOLESALE[packSku] ?? 149;
  const retailEur = Number(body.retailEur ?? wholesaleEur * 3);
  if (!Number.isFinite(retailEur) || retailEur < wholesaleEur) {
    return NextResponse.json({ error: "retailEur must be >= wholesale" }, { status: 400 });
  }

  try {
    const result = await chargePartnerClientPack({
      partnerWorkspaceId,
      clientWorkspaceId,
      packSku,
      retailEur,
      wholesaleEur,
      clientEmail: body.clientEmail,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Charge failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
