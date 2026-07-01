import { type NextRequest, NextResponse } from "next/server";
import { getSaasCpqEnterpriseService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await getSaasCpqEnterpriseService().processDueDunning(100);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron saas-dunning]", e);
    // Schema not migrated yet — cron should not fail the whole pipeline
    if (/relation .* does not exist|42P01/i.test(msg)) {
      return NextResponse.json({ ok: true, processed: 0, failed: 0, skipped: "schema_not_ready" });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
