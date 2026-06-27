import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsTruthGuardService, type TruthChannel, type TruthStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel") as TruthChannel | null;
    const status = searchParams.get("status") as TruthStatus | null;
    const packRunId = searchParams.get("packRunId") ?? undefined;
    const svc = getOsTruthGuardService();
    const [summary, audits] = await Promise.all([
      svc.getSummary(),
      svc.listAudits({ channel: channel ?? undefined, status: status ?? undefined, packRunId, limit: 100 }),
    ]);
    return NextResponse.json({ summary, audits });
  } catch (e) {
    console.error("[os/truth-guard GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
