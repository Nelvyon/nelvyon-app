import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsRegulatedSectorShieldService, type ShieldStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ShieldStatus | null;
    const svc = getOsRegulatedSectorShieldService();
    const [summary, audits] = await Promise.all([
      svc.getSummary(),
      svc.listAudits({ status: status ?? undefined, limit: 100 }),
    ]);
    return NextResponse.json({ summary, audits });
  } catch (e) {
    console.error("[os/shield GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
