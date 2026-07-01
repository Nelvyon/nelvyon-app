import { NextResponse } from "next/server";
import {
  getSaasStarterPackService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — Kit de arranque oficial Nelvyon (6 workflows + 4 secuencias). */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const result = await getSaasStarterPackService().install(ctx.tenant.id);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function GET() {
  return NextResponse.json({
    id: "nelvyon-starter",
    name: "Kit de arranque Nelvyon",
    description: "Automatizaciones y secuencias oficiales listas para activar",
    workflows: 6,
    sequences: 4,
  });
}
