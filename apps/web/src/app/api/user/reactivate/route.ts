import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { CancellationService } from "../../../../../../../backend/billing/cancellationService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const claims = await authenticate(req);
    const service = CancellationService.getInstance();
    await service.reactivateSubscription(claims.userId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "Error al reactivar";
    console.error("[user/reactivate]", e);
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
