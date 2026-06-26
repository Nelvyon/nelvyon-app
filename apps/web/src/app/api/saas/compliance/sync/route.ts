import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasComplianceVaultService,
  SaasComplianceVaultError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json().catch(() => ({}))) as { packRunId?: string };
    const svc = getSaasComplianceVaultService();

    if (body.packRunId) {
      const artifact = await svc.syncFromPackRun(ctx.tenant.id, body.packRunId);
      return NextResponse.json({ synced: 1, artifacts: [artifact] });
    }

    const result = await svc.syncFromDeliverablesHub(ctx.tenant.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SaasComplianceVaultError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[compliance/sync POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
