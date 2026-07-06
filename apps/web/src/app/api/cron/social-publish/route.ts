/**
 * Cron: publish social posts scheduled_at <= NOW().
 * Protected by CRON_SECRET. Processes all tenants in one pass.
 *
 * Railway cron schedule: * * * * *  (every minute)
 */
import { NextResponse } from "next/server";
import { getSaasSocialService } from "@nelvyon/saas";
import { verifyCronHeader } from "@/lib/cronAuth";
import { runWithCronDeadline } from "../../../../../../../backend/http/cronDeadline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const denied = verifyCronHeader(req.headers.get("x-cron-secret"));
  if (denied) return denied;

  try {
    const { published, failed } = await runWithCronDeadline("social-publish", () =>
      getSaasSocialService().processDueScheduled(),
    );

    return NextResponse.json({
      ok: true,
      published,
      failed,
      at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cron failed";
    console.error("[cron/social-publish]", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 504 });
  }
}
