import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsPackCertificationService,
  OsPackCertError,
} from "../../../../../../../../../backend/os-agents/packs/OsPackCertificationService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ packId: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { packId } = await ctx.params;
    const cert = await getOsPackCertificationService().getCertification(packId);
    return NextResponse.json({ certification: cert });
  } catch (e) {
    if (e instanceof OsPackCertError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[os/packs/certifications/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
