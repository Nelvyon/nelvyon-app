export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// La retencion trabaja sobre TODOS los inquilinos: es mantenimiento, no una
// consulta de nadie. Con la conexion de peticion, el dia del cutover a
// `nelvyon_web_app` las politicas filtrarian fila a fila y esto NO daria error:
// borraria CERO FILAS, indistinguible de «no habia nada que caducara». Una purga
// que deja de purgar en silencio es peor que no tenerla, porque nadie vuelve a
// mirarla.
import { DbJobsClient } from "../../../../../../../backend/db/DbJobsClient";
import { aplicarRetencionDeEjecuciones } from "../../../../../../../backend/saas/loQueCaducaDeUnaEjecucion";
import { verifyCronBearer } from "@/lib/cronAuth";
import { runWithCronDeadline } from "../../../../../../../backend/http/cronDeadline";
import { errorSeguro } from "../../../../../../../backend/seguridad/avisoSeguro";

/**
 * Diario: caduca lo que una persona escribio (90 dias) y retira las ejecuciones
 * de mas de dos anos.
 *
 * La politica vive en `loQueCaducaDeUnaEjecucion`, no aqui: esta ruta solo la
 * dispara y deja constancia de cuanto toco. Si el cron deja de correr, la unica
 * consecuencia es que la proxima pasada tenga mas trabajo — las sentencias son
 * idempotentes y acotadas a proposito.
 */
export async function GET(req: Request) {
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;

  try {
    const resultado = await runWithCronDeadline("saas-retencion-ejecuciones", async () =>
      aplicarRetencionDeEjecuciones(DbJobsClient.getInstance()),
    );
    // Cuanto se toco queda escrito: una purga silenciosa no se puede auditar, y
    // «cero» tiene que poder distinguirse de «no se ejecuto».
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e: unknown) {
    errorSeguro("saas-retencion-ejecuciones", "no se pudo aplicar la retencion", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
