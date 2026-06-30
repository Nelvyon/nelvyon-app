import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isProspectingConfigured(): boolean {
  return Boolean(process.env.APOLLO_API_KEY?.trim());
}

/** GET /api/saas/prospecting — listas B2B (requiere APOLLO_API_KEY). */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    void ctx;

    if (!isProspectingConfigured()) {
      return NextResponse.json({
        configured: false,
        message: "Configura APOLLO_API_KEY en Railway para prospección B2B real.",
        lists: [],
      });
    }

    return NextResponse.json({
      configured: true,
      lists: [],
    });
  } catch (err) {
    const status = saasErrorStatus(err);
    return NextResponse.json(saasErrorBody(err), { status });
  }
}
