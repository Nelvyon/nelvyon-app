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

/** POST /api/saas/prospecting/sync — sincroniza prospectos seleccionados con CRM. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const prospectIds = Array.isArray(b.prospectIds)
      ? b.prospectIds.filter((id): id is string => typeof id === "string")
      : [];
    const result = await getSaasProspectingService().syncToCrm(ctx.tenant.id, prospectIds);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SaasProspectingError) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    const status = saasErrorStatus(err);
    return NextResponse.json(saasErrorBody(err), { status });
  }
}
