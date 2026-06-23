import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { saasNotificationService } from "../../../../../../../../backend/saas/SaasNotificationService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "notifications.write");
    const count = await saasNotificationService.markAllRead(ctx.claims.userId, ctx.tenant.id);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
