import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsDeliveryCertificateService, OsDeliveryCertError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { packRunId, force?, tenantId? } — issue or re-issue a delivery certificate. */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json().catch(() => ({}))) as { packRunId?: string; force?: boolean; tenantId?: string };
    if (!body.packRunId) {
      return NextResponse.json({ error: "packRunId requerido", code: "VALIDATION" }, { status: 400 });
    }
    const cert = await getOsDeliveryCertificateService().issueCertificate(body.packRunId, {
      force: body.force,
      tenantId: body.tenantId ?? null,
    });
    return NextResponse.json({ certificate: cert });
  } catch (e) {
    if (e instanceof OsDeliveryCertError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[os/certificates/issue POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
