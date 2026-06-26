import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasComplianceVaultService,
  SaasComplianceVaultError,
  requireSaasContext,
  type ListVaultFilters,
  type ComplianceStatus,
  type ConsentType,
} from "@nelvyon/saas";

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
    console.error("[compliance GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
