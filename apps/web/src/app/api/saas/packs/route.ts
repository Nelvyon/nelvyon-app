import { type NextRequest, NextResponse } from "next/server";
import { getSaasPackStoreService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasPackStoreService();
    const [summary, catalog, entitlements] = await Promise.all([
      svc.getStoreSummary(ctx.tenant.id),
      svc.getStoreCatalog(ctx.tenant.id),
      svc.listEntitlements(ctx.tenant.id),
    ]);
    return NextResponse.json({ summary, catalog, entitlements });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[packs GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
