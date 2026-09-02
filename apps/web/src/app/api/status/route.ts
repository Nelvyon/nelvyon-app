import { NextResponse } from "next/server";

// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// Esta ruta esta declarada sin contexto de inquilino a proposito (ver
// `test_las_rutas_web_fijan_el_inquilino`): estado publico del servicio.
//
// Con la conexion de peticion funciona hoy solo porque `DATABASE_URL` apunta a
// `postgres`, que salta RLS. El dia que apunte a `nelvyon_web_app` —el plan
// `WEB_DB_ROLE_CUTOVER`— las politicas filtrarian fila a fila y esta ruta NO
// daria error: devolveria CERO FILAS.
//
// `DbJobsClient` cae a `DATABASE_URL` mientras `NELVYON_WEB_JOBS_DATABASE_URL`
// no exista, asi que HOY no cambia ninguna conducta.
import { DbJobsClient } from "../../../../../../backend/db/DbJobsClient";
import { getCurrentStatus } from "@nelvyon/monitoring";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET() {
  try {
    // `DbJobsClient.getInstance()` lanza de forma SINCRONA si falta DATABASE_URL.
    // Invocado directamente dentro del array de `Promise.all`, abortaba la
    // construccion del array despues de que `getCurrentStatus()` ya hubiera
    // devuelto una promesa rechazada: esa promesa se quedaba sin manejador y
    // el `unhandledRejection` de server.js tumbaba el proceso entero, aunque
    // este `catch` devolviese su respuesta de reserva. Envolviendolo en una
    // funcion async, el throw sincrono se convierte en rechazo y `Promise.all`
    // llega siempre a manejar ambas promesas.
    const consultaIncidencias = async () =>
      DbJobsClient.getInstance().query<{
        id: string;
        title: string;
        message: string;
        severity: string;
        resolved: boolean;
        created_at: string;
      }>(
        `SELECT id, title, message, severity, resolved, created_at
         FROM incidents
         WHERE resolved = false OR created_at > now() - interval '7 days'
         ORDER BY created_at DESC
         LIMIT 10`,
      );

    const [current, incidents] = await Promise.all([getCurrentStatus(), consultaIncidencias()]);

    const allUp = Object.values(current).every((s) => s.status === "up");
    const anyDown = Object.values(current).some((s) => s.status === "down");
    const overallStatus = anyDown ? "down" : allUp ? "operational" : "degraded";

    return NextResponse.json({
      status: overallStatus,
      services: current,
      incidents,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "unknown", services: {}, incidents: [], updatedAt: new Date().toISOString() },
      { status: 200 },
    );
  }
}
