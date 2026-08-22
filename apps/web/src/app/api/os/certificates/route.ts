import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformBffAuth";
import { TODOS_LOS_CERTIFICADOS, getOsDeliveryCertificateService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Operator dashboard — platform admin only (cross-tenant certificates). */
export async function GET(req: Request) {
  const claims = await requirePlatformAdmin(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const packId = searchParams.get("packId") ?? undefined;
    const svc = getOsDeliveryCertificateService();
    const [summary, certificates] = await Promise.all([
      // Vista GLOBAL, deliberada: ruta de administrador de plataforma
      // (`requirePlatformAdmin` devuelve 403 a quien no lo sea). Antes el
      // alcance global se obtenia por OMISION; ahora esta escrito.
      svc.getSummary(TODOS_LOS_CERTIFICADOS),
      svc.listCertificates(TODOS_LOS_CERTIFICADOS, 50, packId ? { packId } : {}),
    ]);
    return NextResponse.json({ summary, certificates });
  } catch (e) {
    console.error("[os/certificates GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
