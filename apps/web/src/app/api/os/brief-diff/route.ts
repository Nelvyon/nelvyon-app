import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsBriefDiffRerunService, type BriefDiffStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as BriefDiffStatus | null;
    const svc = getOsBriefDiffRerunService();
    const [summary, diffs] = await Promise.all([
      svc.getSummary(),
      svc.listDiffs({
        sourcePackRunId: searchParams.get("sourcePackRunId") ?? undefined,
        status: status ?? undefined,
        limit: 100,
      }),
    ]);
    return NextResponse.json({ summary, diffs });
  } catch (e) {
    console.error("[os/brief-diff GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
