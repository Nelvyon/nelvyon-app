import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPwaService,
  requireSaasContext,
  type PwaInstallPlatform, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const userId = ctx.claims.userId ?? null;
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
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[pwa/install POST]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
