import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsDeliveryCertificateService, OsDeliveryCertError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Authenticated HTML viewer for a delivery certificate (platform only in v1). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { id } = await ctx.params;
    const cert = await getOsDeliveryCertificateService().getCertificate(id);
    const html = cert.htmlBody ?? "<!doctype html><body>Certificado sin contenido (status: " + cert.status + ")</body>";
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof OsDeliveryCertError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[os/certificates/[id]/html GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
