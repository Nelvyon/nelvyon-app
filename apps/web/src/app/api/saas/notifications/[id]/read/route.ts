import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { saasNotificationService } from "../../../../../../../../../backend/saas/SaasNotificationService";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSaasContext(req, "notifications.write");
    const { id } = await params;
    const ok = await saasNotificationService.markRead(id, ctx.claims.userId);
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
