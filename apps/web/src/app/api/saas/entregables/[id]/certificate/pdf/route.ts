export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  buildMinimalPdfFromText,
  certificateToPdfLines,
  getOsDeliveryCertificateService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../../../backend/db/DbClient";

/** GET /api/saas/entregables/[id]/certificate/pdf — tenant delivery certificate PDF */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSaasContext(req, "audit.read");
    const { id } = await ctx.params;
    const db = DbClient.getInstance();
    const delRows = await db.query<{ pack_run_id: string | null }>(
      `SELECT metadata->>'pack_run_id' AS pack_run_id
       FROM os_deliverables d
       JOIN saas_tenants t ON t.workspace_id = d.workspace_id
       WHERE d.id = $1::uuid AND t.id = $2::uuid LIMIT 1`,
      [id, auth.tenant.id],
    );
    const packRunId = delRows[0]?.pack_run_id;
    if (!packRunId) {
      return NextResponse.json({ error: "No pack run linked to deliverable" }, { status: 404 });
    }
    const certSvc = getOsDeliveryCertificateService();
    const full = await certSvc.getByPackRun(packRunId);
    if (!full) {
      return NextResponse.json({ error: "Certificate not issued yet" }, { status: 404 });
    }
    const lines = certificateToPdfLines(full);
    lines.push("", "Legal attestation: QA visual + legal gates passed at issuance.", `Verify: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/os/certificates/${full.id}/html`);
    const pdf = buildMinimalPdfFromText(lines, `Nelvyon Delivery Certificate — ${full.packId}`);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nelvyon-delivery-${packRunId.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
