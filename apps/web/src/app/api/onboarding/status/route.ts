import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { getOnboardingStatus } from "@nelvyon/onboarding";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const status = await getOnboardingStatus(claims.userId);
    return NextResponse.json(status);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
