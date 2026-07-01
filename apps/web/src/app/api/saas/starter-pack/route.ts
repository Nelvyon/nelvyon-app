import { NextResponse } from "next/server";
import {
  getSaasGhlStarterPackService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — install GHL/HubSpot starter pack (6 workflows + 4 sequences). */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const result = await getSaasGhlStarterPackService().install(ctx.tenant.id);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function GET() {
  return NextResponse.json({
    id: "ghl-hubspot-starter",
    name: "Pack GHL + HubSpot Starter",
    description: "6 workflows + 4 secuencias drip listas para activar",
    workflows: 6,
    sequences: 4,
  });
}
