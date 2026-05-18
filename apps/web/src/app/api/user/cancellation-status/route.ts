import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { CancellationService } from "../../../../../../../backend/billing/cancellationService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const claims = await authenticate(req);
    const service = CancellationService.getInstance();
    const status = await service.getCancellationStatus(claims.userId);
    return NextResponse.json(status);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
