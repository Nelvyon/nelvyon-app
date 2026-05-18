import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { MetaAdsExecutor } from "../../../../../../../../backend/integrations/meta/MetaAdsExecutor";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const accounts = await MetaAdsExecutor.instance().listAdAccounts(claims.userId);
    return NextResponse.json({ accounts });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "Meta account not connected") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
