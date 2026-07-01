export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasSequencesService } from "@nelvyon/saas";

function assertCron(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;
  const processed = await getSaasSequencesService().processDueEnrollments(async () => {
    /* SES send wired in SaasCampaniasService when keys present */
  });
  return NextResponse.json({ ok: true, processed });
}
