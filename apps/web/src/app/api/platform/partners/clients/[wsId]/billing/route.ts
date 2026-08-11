import { NextResponse } from "next/server";

import { requirePlatformContext } from "@/lib/platformBffAuth";
import { upsertPartnerClientBilling } from "@/lib/partners/partnerConnectStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ wsId: string }> },
) {
  // Fijar el precio de reventa es autoridad comercial: owner/admin.
  const gate = await requirePlatformContext(req, "partners.billing.manage");
  if (gate instanceof NextResponse) return gate;
  const partnerWorkspaceId = gate.workspaceId;

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
  // Leer la configuración de reventa expone márgenes: misma autoridad.
  const gate = await requirePlatformContext(req, "partners.billing.manage");
  if (gate instanceof NextResponse) return gate;
  const partnerWorkspaceId = gate.workspaceId;

  const { wsId } = await ctx.params;
  const clientWorkspaceId = Number(wsId);
  const { getPartnerClientBilling } = await import("@/lib/partners/partnerConnectStore");
  const billing = await getPartnerClientBilling(partnerWorkspaceId, clientWorkspaceId);
  return NextResponse.json({ billing });
}
