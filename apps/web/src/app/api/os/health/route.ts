import { NextResponse } from "next/server";
// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// Esta ruta esta declarada sin contexto de inquilino a proposito (ver
// `test_las_rutas_web_fijan_el_inquilino`): sonda de salud sin inquilino.
//
// Con la conexion de peticion funciona hoy solo porque `DATABASE_URL` apunta a
// `postgres`, que salta RLS. El dia que apunte a `nelvyon_web_app` —el plan
// `WEB_DB_ROLE_CUTOVER`— las politicas filtrarian fila a fila y esta ruta NO
// daria error: devolveria CERO FILAS.
//
// `DbJobsClient` cae a `DATABASE_URL` mientras `NELVYON_WEB_JOBS_DATABASE_URL`
// no exista, asi que HOY no cambia ninguna conducta.
import { DbJobsClient } from "@/../../backend/db/DbJobsClient";

export const runtime = "nodejs";

export async function GET() {
  try {
    await DbJobsClient.getInstance().query("SELECT 1");
    return NextResponse.json({ ok: true, os: "up", db: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, os: "degraded", db: "error" }, { status: 503 });
  }
}
