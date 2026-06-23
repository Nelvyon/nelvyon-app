import { NextResponse } from "next/server";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { saasProfileService } from "../../../../../../../backend/saas/SaasProfileService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "profile.read");
    const profile = await saasProfileService.getProfile(ctx.claims.userId, ctx.tenant.id);
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
