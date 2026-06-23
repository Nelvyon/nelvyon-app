import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { saasNotificationService } from "../../../../../../../backend/saas/SaasNotificationService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "notifications.read");
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const notifications = unreadOnly
      ? await saasNotificationService.getRecentUnread(ctx.claims.userId, ctx.tenant.id)
      : await saasNotificationService.getNotifications(ctx.claims.userId, ctx.tenant.id);
    return NextResponse.json({ notifications });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
