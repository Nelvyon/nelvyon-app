import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { saasNotificationService } from "../../../../../../../../backend/saas/SaasNotificationService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "notifications.read");
    const count = await saasNotificationService.getUnreadCount(ctx.claims.userId, ctx.tenant.id);
    return NextResponse.json({ count });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
