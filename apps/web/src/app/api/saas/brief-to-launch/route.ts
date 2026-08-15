import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasBriefToLaunchService,
  SaasBriefToLaunchError,
  requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasBriefToLaunchService();
    const [packs, launches] = await Promise.all([
      svc.listAvailablePacks(ctx.tenant.id),
      svc.listLaunches(ctx.tenant.id, 10),
    ]);
    return NextResponse.json({ packs, launches });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[brief-to-launch GET]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as { packId?: string; brief?: Record<string, unknown> };
    if (!body.packId) {
      return NextResponse.json({ error: "packId requerido" }, { status: 400 });
    }
    const svc = getSaasBriefToLaunchService();
    const launch = await svc.createLaunch(ctx.tenant.id, {
      packId: body.packId,
      brief: body.brief ?? {},
      userId: ctx.claims.userId,
    });

    // Execute async — do not await (long running). Client polls getLaunchStatus.
    void svc.executeLaunch(ctx.tenant.id, launch.id).catch((err) => {
      console.error(`[brief-to-launch] executeLaunch failed ${launch.id}:`, err);
    });

    return NextResponse.json({ launch }, { status: 201 });
  } catch (e) {
    if (e instanceof SaasBriefToLaunchError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const estado = saasErrorStatus(e);
    // Solo es incidencia lo que de verdad lo es. Un tenant ausente o un
    // permiso denegado son respuestas del contrato, no averias.
    if (estado >= 500) console.error("[brief-to-launch POST]", e);
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
