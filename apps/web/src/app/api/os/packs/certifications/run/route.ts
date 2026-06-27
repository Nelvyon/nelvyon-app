import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsPackCertificationService,
  OsPackCertError,
} from "../../../../../../../../../backend/os-agents/packs/OsPackCertificationService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** POST { packId? } — certify one pack, or all 8 if packId omitted. */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { packId?: string; dryRun?: boolean };
    const svc = getOsPackCertificationService();
    if (body.packId) {
      const cert = await svc.runCertification(body.packId, { dryRun: body.dryRun });
      return NextResponse.json({ certification: cert });
    }
    const items = await svc.runAllCertifications({ dryRun: body.dryRun });
    return NextResponse.json({ certified: items.length, items });
  } catch (e) {
    if (e instanceof OsPackCertError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[os/packs/certifications/run POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
