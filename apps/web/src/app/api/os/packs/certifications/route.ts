import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsPackCertificationService } from "../../../../../../../../backend/os-agents/packs/OsPackCertificationService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const svc = getOsPackCertificationService();
    const [summary, items] = await Promise.all([svc.getSummary(), svc.listCertifications()]);
    return NextResponse.json({ summary, items });
  } catch (e) {
    console.error("[os/packs/certifications GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
