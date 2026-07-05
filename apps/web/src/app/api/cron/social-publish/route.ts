/**
 * Cron: publish social posts scheduled_at <= NOW().
 * Protected by CRON_SECRET. Processes all tenants in one pass.
 *
 * Railway cron schedule: * * * * *  (every minute)
 */
import { NextResponse } from "next/server";
import { getSaasSocialService } from "@nelvyon/saas";
import { verifyCronHeader } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const denied = verifyCronHeader(req.headers.get("x-cron-secret"));
  if (denied) return denied;

  const { published, failed } = await getSaasSocialService().processDueScheduled();

  return NextResponse.json({
    ok: true,
    published,
    failed,
    at: new Date().toISOString(),
  });
}
