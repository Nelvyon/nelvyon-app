import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getUsageSummary } from "@nelvyon/usage";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(_req: Request) {
  try {
    const claims = await authenticate(_req);
    const summary = await getUsageSummary(claims.userId);
    return NextResponse.json(summary);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
