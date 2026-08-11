import { NextResponse } from "next/server";

import { requirePlatformContext } from "@/lib/platformBffAuth";
import { chargePartnerClientPack } from "@/lib/partners/partnerConnectStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PACK_WHOLESALE: Record<string, number> = {
  local_business_growth: 149,
  ecommerce_growth: 199,
  saas_b2b_growth: 249,
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ wsId: string }> },
) {
  // Cobrar mueve dinero de un tercero: owner-only, y comprobado ANTES de leer
  // el cuerpo o tocar Stripe.
  const gate = await requirePlatformContext(req, "partners.billing.charge");
  if (gate instanceof NextResponse) return gate;
  const partnerWorkspaceId = gate.workspaceId;

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
