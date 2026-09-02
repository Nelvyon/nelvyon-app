/**
 * Email click tracking redirect.
 * Increments clicked_count and redirects to the original URL.
 */
import { type NextRequest, NextResponse } from "next/server";
import { verifyTrackingToken } from "../../../../../../../../../backend/email/trackingToken";
// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// Esta ruta esta declarada sin contexto de inquilino a proposito (ver
// `test_las_rutas_web_fijan_el_inquilino`): seguimiento por token opaco.
//
// Con la conexion de peticion funciona hoy solo porque `DATABASE_URL` apunta a
// `postgres`, que salta RLS. El dia que apunte a `nelvyon_web_app` —el plan
// `WEB_DB_ROLE_CUTOVER`— las politicas filtrarian fila a fila y esta ruta NO
// daria error: devolveria CERO FILAS.
//
// `DbJobsClient` cae a `DATABASE_URL` mientras `NELVYON_WEB_JOBS_DATABASE_URL`
// no exista, asi que HOY no cambia ninguna conducta.
import { DbJobsClient } from "../../../../../../../../../backend/db/DbJobsClient";
import { dispatchEmailClicked } from "../../../../../../../../../backend/saas/saasWorkflowDispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const result = verifyTrackingToken(token);

  if (!result.ok || result.payload.t !== "c" || !result.payload.url) {
    // Invalid token — redirect to homepage rather than showing an error
    return NextResponse.redirect("https://nelvyon.com", { status: 302 });
  }

  const { tid, cid, rid, url } = result.payload;
  const db = DbJobsClient.getInstance();

  await db.query(
    `UPDATE saas_campania_recipients
     SET status = CASE WHEN status IN ('sent','opened') THEN 'clicked' ELSE status END,
         clicked_at = COALESCE(clicked_at, NOW())
     WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
    [tid, cid, rid],
  ).catch(() => null);

  await db.query(
    `UPDATE saas_campanias
     SET clicked_count = clicked_count + 1, updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2`,
    [tid, cid],
  ).catch(() => null);

  await db.query(
    `UPDATE saas_sequence_enrollments
     SET email_clicked = true, email_opened = true
     WHERE tenant_id = $1 AND sequence_id = $2 AND contact_id = $3 AND status = 'active'`,
    [tid, cid, rid],
  ).catch(() => null);

  // Fire email_clicked workflow trigger (fire-and-forget — must not delay redirect)
  void dispatchEmailClicked(tid, cid, rid, url);

  // Validate the destination URL is http/https before redirecting
  let destination: URL;
  try {
    destination = new URL(url);
    if (!["http:", "https:"].includes(destination.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.redirect("https://nelvyon.com", { status: 302 });
  }

  return NextResponse.redirect(destination.toString(), { status: 302 });
}
