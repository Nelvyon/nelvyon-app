import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  buildMinimalPdfFromText,
  certificateToPdfLines,
  getOsDeliveryCertificateService,
  OsDeliveryCertError,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PDF delivery certificate (platform auth). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { id } = await ctx.params;
    const cert = await getOsDeliveryCertificateService().getCertificate(id);
    const lines = certificateToPdfLines(cert);
    const pdf = buildMinimalPdfFromText(lines, `Nelvyon Certificate — ${cert.packId}`);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nelvyon-cert-${cert.packRunId.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof OsDeliveryCertError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[os/certificates/[id]/pdf GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
