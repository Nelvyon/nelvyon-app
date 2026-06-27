import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsSectorReadinessService } from "../../../../../../../backend/os-agents/sectors/OsSectorReadinessService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const svc = getOsSectorReadinessService();
    const [summary, sectors] = await Promise.all([svc.getSummary(), svc.listSectors()]);
    return NextResponse.json({ summary, sectors });
  } catch (e) {
    console.error("[os/sectors GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
