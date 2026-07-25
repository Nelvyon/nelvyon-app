import { NextResponse } from "next/server";
import { listSectorPlaybooks } from "../../../../../../../../backend/agency/SectorCapabilityTaxonomy";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    return NextResponse.json({
      sectors: listSectorPlaybooks(),
      note: "Canonical taxonomy · health/education BLOCKED_LEGAL · industry PREPARED_OFF until dedicated pack",
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
