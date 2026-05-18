import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { GoogleAdsExecutor } from "../../../../../../../../backend/integrations/google/GoogleAdsExecutor";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const accounts = await GoogleAdsExecutor.instance().listCustomerAccounts(claims.userId);
    return NextResponse.json({ accounts });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "Google account not connected") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
