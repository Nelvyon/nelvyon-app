import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsRecurringRunLogService,
  type RecurringRunFilters,
  type RecurringRunServiceType,
  type RecurringRunStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const filters: RecurringRunFilters = { limit: 100 };
    if (searchParams.get("serviceType")) filters.serviceType = searchParams.get("serviceType") as RecurringRunServiceType;
    if (searchParams.get("status")) filters.status = searchParams.get("status") as RecurringRunStatus;
    if (searchParams.get("period")) filters.periodKey = searchParams.get("period")!;

    const svc = getOsRecurringRunLogService();
    const [summary, runs] = await Promise.all([svc.getSummary(), svc.listRuns(filters)]);
    return NextResponse.json({ summary, runs });
  } catch (e) {
    console.error("[os/recurring GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
