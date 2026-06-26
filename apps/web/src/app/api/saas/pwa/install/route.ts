import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPwaService,
  requireSaasContext,
  type PwaInstallPlatform,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const userId = (ctx as { user?: { id: string } }).user?.id ?? null;
    const body = (await req.json().catch(() => ({}))) as { platform?: PwaInstallPlatform; displayMode?: string };
    const svc = getSaasPwaService();
    const result = await svc.recordInstall(ctx.tenant.id, {
      userId,
      platform: body.platform,
      displayMode: body.displayMode,
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[pwa/install POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
