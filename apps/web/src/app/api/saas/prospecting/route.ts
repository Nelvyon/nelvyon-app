import { NextResponse } from "next/server";
import {
  getSaasProspectingService,
  SaasProspectingError,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasProspectingError): NextResponse {
  if (e.code === "NOT_CONFIGURED") {
    return NextResponse.json(
      {
        configured: false,
        code: e.code,
        message: "Define APOLLO_API_KEY en Railway para activar búsqueda B2B real.",
        lists: [],
      },
      { status: 503 },
    );
  }
  if (e.code === "NOT_MIGRATED") {
    return NextResponse.json(
      {
        configured: false,
        code: e.code,
        message: e.message,
        lists: [],
      },
      { status: 503 },
    );
  }
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/prospecting — listas B2B persistidas (+ prospectos con ?listId=). */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasProspectingService();
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");

    if (listId) {
      const prospects = await svc.listProspects(ctx.tenant.id, listId);
      return NextResponse.json({
        configured: svc.isConfigured(),
        prospects,
      });
    }

    const lists = await svc.listLists(ctx.tenant.id);
    return NextResponse.json({
      configured: svc.isConfigured(),
      message: svc.isConfigured()
        ? undefined
        : "Define APOLLO_API_KEY en Railway para activar búsqueda B2B real.",
      lists,
    });
  } catch (err) {
    if (err instanceof SaasProspectingError) return mapError(err);
    const status = saasErrorStatus(err);
    return NextResponse.json(saasErrorBody(err), { status });
  }
}
