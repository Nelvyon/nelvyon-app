import { type NextRequest, NextResponse } from "next/server";
import { getSaasVoiceCommandService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasVoiceCommandService();
    const [catalog, history] = await Promise.all([
      Promise.resolve(svc.getCatalog()),
      svc.listHistory(ctx.tenant.id, 20),
    ]);
    return NextResponse.json({ catalog, history });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[voice GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
