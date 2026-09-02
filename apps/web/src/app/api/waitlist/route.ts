import { NextRequest, NextResponse } from "next/server";

// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// Esta ruta esta declarada sin contexto de inquilino a proposito (ver
// `test_las_rutas_web_fijan_el_inquilino`): lista de espera publica.
//
// Con la conexion de peticion funciona hoy solo porque `DATABASE_URL` apunta a
// `postgres`, que salta RLS. El dia que apunte a `nelvyon_web_app` —el plan
// `WEB_DB_ROLE_CUTOVER`— las politicas filtrarian fila a fila y esta ruta NO
// daria error: devolveria CERO FILAS.
//
// `DbJobsClient` cae a `DATABASE_URL` mientras `NELVYON_WEB_JOBS_DATABASE_URL`
// no exista, asi que HOY no cambia ninguna conducta.
import { DbJobsClient } from "../../../../../../backend/db/DbJobsClient";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const db = DbJobsClient.getInstance();
    await db.query(
      `INSERT INTO waitlist (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email.trim().toLowerCase()],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[waitlist] insert failed", e);
    return NextResponse.json({ error: "Unable to join waitlist" }, { status: 503 });
  }
}
