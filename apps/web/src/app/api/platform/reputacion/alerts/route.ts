import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { EMPTY_ALERTS } from "@/lib/reputacionBffRoute";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  return NextResponse.json(EMPTY_ALERTS);
}
