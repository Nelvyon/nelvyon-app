import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DunningService } from "../../../../../../../backend/billing/dunningService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const claims = await authenticate(req);
    const dunning = DunningService.getInstance();
    const result = await dunning.getDunningStatus(claims.tenantId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
