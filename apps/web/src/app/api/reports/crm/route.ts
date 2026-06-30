import { NextResponse } from "next/server";

import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function emptyCrmReport(start: string, end: string) {
  return {
    period: { start_date: start, end_date: end },
    contacts: { total: 0, new: 0 },
    deals: { total: 0, won: 0, pipeline_value: 0 },
    mock: true,
  };
}

/** CRM report for analytics/reportes — FastAPI pipeline analytics or honest empty payload. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const start = url.searchParams.get("start_date") ?? "";
  const end = url.searchParams.get("end_date") ?? "";

  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(emptyCrmReport(start, end));
  }
  if (claims instanceof NextResponse) {
    return NextResponse.json(emptyCrmReport(start, end));
  }

  try {
    const upstream = await proxyPlatformFetch(req, "GET", "/api/v1/crm/analytics/pipeline");
    if (upstream.ok) {
      const data = await upstream.json();
      return NextResponse.json({
        period: { start_date: start, end_date: end },
        pipeline: data,
        mock: false,
      });
    }
    if (upstreamFailed(upstream.status)) {
      return NextResponse.json(emptyCrmReport(start, end));
    }
    return NextResponse.json(emptyCrmReport(start, end));
  } catch {
    return NextResponse.json(emptyCrmReport(start, end));
  }
}
