import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsDeliveryCertificateService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const packId = searchParams.get("packId") ?? undefined;
    const svc = getOsDeliveryCertificateService();
    const [summary, certificates] = await Promise.all([
      svc.getSummary(),
      svc.listCertificates(50, packId ? { packId } : {}),
    ]);
    return NextResponse.json({ summary, certificates });
  } catch (e) {
    console.error("[os/certificates GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
