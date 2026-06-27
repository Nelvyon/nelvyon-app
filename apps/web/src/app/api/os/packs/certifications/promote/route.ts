import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsPackCertificationService,
  OsPackCertError,
} from "../../../../../../../../../backend/os-agents/packs/OsPackCertificationService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { packId } — promote a beta pack to available (requires valid certification). */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { packId?: string };
    if (!body.packId) {
      return NextResponse.json({ error: "packId requerido", code: "VALIDATION" }, { status: 400 });
    }
    const cert = await getOsPackCertificationService().promoteToAvailable(body.packId);
    return NextResponse.json({ promoted: true, certification: cert });
  } catch (e) {
    if (e instanceof OsPackCertError) {
      const status = e.code === "NOT_CERTIFIED" ? 422 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[os/packs/certifications/promote POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
