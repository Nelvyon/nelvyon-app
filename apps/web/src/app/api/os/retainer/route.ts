import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsRetainerAutopilotService, type RetainerCycleStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as RetainerCycleStatus | null;
    const svc = getOsRetainerAutopilotService();
    const [summary, cycles] = await Promise.all([
      svc.getSummary(),
      svc.listCycles({ status: status ?? undefined, limit: 100 }),
    ]);
    return NextResponse.json({ summary, cycles });
  } catch (e) {
    console.error("[os/retainer GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
