import { NextResponse } from "next/server";
import {
  getSaasProspectingService,
  SaasProspectingError,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  type ProspectFilter,
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
        prospects: [],
      },
      { status: 503 },
    );
  }
  if (e.code === "APOLLO_ERROR") {
    return NextResponse.json(
      { configured: true, degraded: true, error: e.message, prospects: [] },
      { status: 503 },
    );
  }
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** POST /api/saas/prospecting/search — búsqueda Apollo + persistencia en listas. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const name = typeof b.name === "string" ? b.name : "";
    const filterRaw = b.filter && typeof b.filter === "object" ? (b.filter as Partial<ProspectFilter>) : {};

    const result = await getSaasProspectingService().searchAndCreateList(ctx.tenant.id, name, filterRaw);
    return NextResponse.json(
      {
        configured: true,
        list: result.list,
        prospects: result.prospects,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof SaasProspectingError) return mapError(err);
    const status = saasErrorStatus(err);
    return NextResponse.json(saasErrorBody(err), { status });
  }
}
