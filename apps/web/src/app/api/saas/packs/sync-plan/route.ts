import { type NextRequest, NextResponse } from "next/server";
import { getSaasPackStoreService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Re-grant plan entitlements from the tenant's current plan (callable after upgrade). */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const svc = getSaasPackStoreService();
    const granted = await svc.grantFromPlan(ctx.tenant.id);
    return NextResponse.json({ granted: granted.length, entitlements: granted });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[packs/sync-plan POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
