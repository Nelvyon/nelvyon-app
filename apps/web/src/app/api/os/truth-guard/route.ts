import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platformBffAuth";
import { TODOS_LOS_INQUILINOS_TRUTH, getOsTruthGuardService, type TruthChannel, type TruthStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Operator dashboard — platform admin only (cross-tenant audits). */
export async function GET(req: Request) {
  const claims = await requirePlatformAdmin(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel") as TruthChannel | null;
    const status = searchParams.get("status") as TruthStatus | null;
    const packRunId = searchParams.get("packRunId") ?? undefined;
    const svc = getOsTruthGuardService();
    const [summary, audits] = await Promise.all([
      // Vista GLOBAL, deliberada: esta ruta es de administrador de plataforma
      // (`requirePlatformAdmin` devuelve 403 a quien no lo sea) y su proposito es
      // precisamente la foto entre inquilinos. Antes el alcance global se obtenia
      // por OMISION, que se parece demasiado a un descuido; ahora esta escrito.
      svc.getSummary(TODOS_LOS_INQUILINOS_TRUTH),
      svc.listAudits(TODOS_LOS_INQUILINOS_TRUTH, { channel: channel ?? undefined, status: status ?? undefined, packRunId, limit: 100 }),
    ]);
    return NextResponse.json({ summary, audits });
  } catch (e) {
    console.error("[os/truth-guard GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
