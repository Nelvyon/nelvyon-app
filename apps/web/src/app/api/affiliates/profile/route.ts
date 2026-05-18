import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { AffiliateService } from "../../../../../../../backend/affiliates/AffiliateService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const svc = AffiliateService.instance();
    await svc.getOrCreateProfile(claims.userId);
    const stats = await svc.getStats(claims.userId);
    return NextResponse.json({ stats });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
