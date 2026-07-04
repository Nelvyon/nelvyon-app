import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROSPECTING_UNAVAILABLE = {
  configured: false,
  message:
    "Prospección B2B vía Apollo no está operativa en este entorno. La integración se activará en un despliegue posterior.",
  lists: [] as const,
};

/** GET /api/saas/prospecting — listas B2B (requiere integración Apollo activa). */
export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    return NextResponse.json(PROSPECTING_UNAVAILABLE, { status: 503 });
  } catch (err) {
    const status = saasErrorStatus(err);
    return NextResponse.json(saasErrorBody(err), { status });
  }
}
