/**
 * Public UTM redirect — no auth required.
 * GET /api/t/{shortCode} → 302 to destination URL with UTM params, logs click.
 */
import { NextResponse } from "next/server";
import { getSaasUtmService, SaasUtmError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const referer = req.headers.get("referer") ?? undefined;

  try {
    const destinationUrl = await getSaasUtmService().trackClick(shortCode, { ip, userAgent, referer });
    return NextResponse.redirect(destinationUrl, { status: 302 });
  } catch (e: unknown) {
    if (e instanceof SaasUtmError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
