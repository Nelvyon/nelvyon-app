import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasComplianceVaultService,
  requireSaasContext,
  type ListVaultFilters,
  type ComplianceStatus,
  type ConsentType, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const filters: ListVaultFilters = {};
    if (searchParams.get("status")) filters.status = searchParams.get("status") as ComplianceStatus;
    if (searchParams.get("consentType")) filters.consentType = searchParams.get("consentType") as ConsentType;
    if (searchParams.get("packId")) filters.packId = searchParams.get("packId")!;
    if (searchParams.get("days")) filters.days = parseInt(searchParams.get("days")!, 10);

    const svc = getSaasComplianceVaultService();
    const [summary, artifacts] = await Promise.all([
      svc.getVaultSummary(ctx.tenant.id),
      svc.listArtifacts(ctx.tenant.id, filters),
    ]);
    return NextResponse.json({ summary, artifacts });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[compliance GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
