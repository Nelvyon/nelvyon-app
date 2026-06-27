import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsVisualQaGateService } from "../../../../../../../../backend/autonomous/qa/OsVisualQaGateService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — run the QA gate against provided HTML/copy (test/preview). Persists audit. */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      landingHtml?: string; copyText?: string; brandColor?: string;
      backgroundColor?: string; baselineHtml?: string; packRunId?: string; deliverableRef?: string;
    };
    const svc = getOsVisualQaGateService();
    const result = await svc.runAndPersist({
      landingHtml: body.landingHtml,
      copyText: body.copyText,
      brandColor: body.brandColor,
      backgroundColor: body.backgroundColor,
      baselineHtml: body.baselineHtml,
      packRunId: body.packRunId,
      deliverableRef: body.deliverableRef,
    });
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[os/qa/run POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
