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

/** POST /api/saas/prospecting/search — búsqueda B2B (requiere APOLLO_API_KEY). */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    void ctx;

    if (!isProspectingConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          message: "Configura APOLLO_API_KEY en Railway para búsqueda B2B real.",
          prospects: [],
        },
        { status: 503 },
      );
    }

    await req.json().catch(() => ({}));

    return NextResponse.json({
      configured: true,
      prospects: [],
      message: "Sin resultados para este filtro.",
    });
  } catch (err) {
    const status = saasErrorStatus(err);
    return NextResponse.json(saasErrorBody(err), { status });
  }
}
