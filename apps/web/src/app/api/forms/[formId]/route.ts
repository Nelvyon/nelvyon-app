/**
 * Public endpoint — no auth — returns form fields for embed widget.
 * CORS open so external sites can fetch form config.
 */
import { NextResponse } from "next/server";
// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// Esta ruta esta declarada sin contexto de inquilino a proposito (ver
// `test_las_rutas_web_fijan_el_inquilino`): formularios publicos: quien los rellena no tiene sesion.
//
// Con la conexion de peticion funciona hoy solo porque `DATABASE_URL` apunta a
// `postgres`, que salta RLS. El dia que apunte a `nelvyon_web_app` —el plan
// `WEB_DB_ROLE_CUTOVER`— las politicas filtrarian fila a fila y esta ruta NO
// daria error: devolveria CERO FILAS.
//
// `DbJobsClient` cae a `DATABASE_URL` mientras `NELVYON_WEB_JOBS_DATABASE_URL`
// no exista, asi que HOY no cambia ninguna conducta.
import { DbJobsClient } from "../../../../../../../backend/db/DbJobsClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;
  const db = DbJobsClient.getInstance();
  const rows = await db.query<{
    id: string;
    name: string;
    description: string | null;
    fields: unknown;
    honeypot_field: string;
    is_active: boolean;
  }>(
    `SELECT id, name, description, fields, honeypot_field, is_active
     FROM saas_forms WHERE id = $1 LIMIT 1`,
    [formId],
  );
  const form = rows[0];
  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
  }
  if (!form.is_active) {
    return NextResponse.json({ error: "Form inactive" }, { status: 400, headers: CORS });
  }
  return NextResponse.json(
    { id: form.id, name: form.name, description: form.description, fields: form.fields, honeypotField: form.honeypot_field },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
