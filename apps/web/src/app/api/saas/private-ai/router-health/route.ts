export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasPrivateAiService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

/** Router health + certification status for ops / SaaS settings UI. */
export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    const health = await getSaasPrivateAiService().getRouterHealthStatus();
    return NextResponse.json({
      certified: health.ok === true,
      declaration: health.ok
        ? "ROUTER DE MODELOS NELVYON COMPLETADO"
        : "ROUTER DE MODELOS NELVYON NO SALUDABLE",
      health,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
