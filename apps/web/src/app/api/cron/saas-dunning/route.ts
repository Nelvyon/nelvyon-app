import { type NextRequest, NextResponse } from "next/server";
import { getSaasCpqEnterpriseService } from "@nelvyon/saas";
import { verifyCronFlexible } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = verifyCronFlexible(
    req.headers.get("x-cron-secret"),
    req.headers.get("authorization"),
  );
  if (denied) return denied;
  try {
    const result = await getSaasCpqEnterpriseService().processDueDunning(100);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron saas-dunning]", e);
    if (/relation .* does not exist|42P01/i.test(msg)) {
      return NextResponse.json({ ok: true, processed: 0, failed: 0, skipped: "schema_not_ready" });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
