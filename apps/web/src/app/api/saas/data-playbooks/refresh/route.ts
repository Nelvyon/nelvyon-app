import { type NextRequest, NextResponse } from "next/server";
import { getSaasDataPlaybooksService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Regenerate playbooks from the tenant's current data. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const svc = getSaasDataPlaybooksService();
    const result = await svc.refreshPlaybooks(ctx.tenant.id);
    return NextResponse.json(result);
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[data-playbooks/refresh POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
