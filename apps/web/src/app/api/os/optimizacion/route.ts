/**
 * Qué debería hacerse ahora con cada objetivo de un cliente.
 *
 * ── POR QUÉ EXISTE ESTA RUTA ────────────────────────────────────────────────
 *
 * `MotorDeResultados` y `MotorDeOptimizacion` estaban construidos y no se
 * tocaban. Al componerlos en `queHacerAhora` quedaron unidos… y el conjunto
 * seguía sin consumidor: un huérfano de dos saltos, que es exactamente el fallo
 * que se estaba corrigiendo. Una capacidad sin puerta de entrada no existe.
 *
 * ── SÓLO LEE ────────────────────────────────────────────────────────────────
 *
 * Consulta objetivos y mediciones y devuelve qué haría. No mueve nada: el
 * propio motor dice «NO EJECUTA. Propone», y esta ruta lo respeta. Cambiar algo
 * de verdad pasa por sus puertas y, si sale hacia fuera, por una persona.
 *
 * ── EL ALCANCE, QUE ES LO DELICADO ──────────────────────────────────────────
 *
 * El workspace sale de la cabecera Y se comprueba contra la pertenencia del
 * usuario. El `clientId` viene por parámetro, pero `panel()` filtra por
 * workspace Y cliente a la vez: pedir el cliente de otro devuelve vacío, no los
 * datos ajenos. La comprobación no depende de que quien llame se porte bien.
 */
import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { assertUserCanAccessWorkspace, WorkspaceAccessError } from "@/lib/platformDbFallback";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import { queHacerAhora } from "../../../../../../../backend/optimizacion/queHacerAhora";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const cabecera = req.headers.get("x-workspace-id");
  const workspaceId = cabecera ? Number(cabecera) : 0;
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }

  try {
    await assertUserCanAccessWorkspace(claims, workspaceId);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim() ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }
  const serviceId = url.searchParams.get("serviceId")?.trim() || "";
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId required" }, { status: 400 });
  }

  const recomendaciones = await queHacerAhora(DbClient.getInstance(), {
    workspaceId,
    clientId,
    serviceId,
  });

  return NextResponse.json({ recomendaciones });
}
