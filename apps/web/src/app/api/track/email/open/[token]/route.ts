/**
 * Email open tracking pixel.
 * Returns a 1x1 transparent GIF and increments opened_count for the campania.
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
import { dispatchEmailOpened } from "../../../../../../../../../backend/saas/saasWorkflowDispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1x1 transparent GIF (43 bytes)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const result = verifyTrackingToken(token);

  if (result.ok && result.payload.t === "o") {
    const { tid, cid, rid } = result.payload;
    const db = DbJobsClient.getInstance();
    // Update recipient status and increment campania opened_count (idempotent via CASE)
    await db.query(
      `UPDATE saas_campania_recipients
       SET status = CASE WHEN status IN ('sent') THEN 'opened' ELSE status END,
           opened_at = COALESCE(opened_at, NOW())
       WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
      [tid, cid, rid],
    ).catch(() => null); // never fail a pixel request

    await db.query(
      `UPDATE saas_campanias
       SET opened_count = opened_count + 1, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tid, cid],
    ).catch(() => null);

    await db.query(
      `UPDATE saas_sequence_enrollments
       SET email_opened = true
       WHERE tenant_id = $1 AND sequence_id = $2 AND contact_id = $3 AND status = 'active'`,
      [tid, cid, rid],
    ).catch(() => null);

    // Fire email_opened workflow trigger (fire-and-forget — must not delay pixel)
    void dispatchEmailOpened(tid, cid, rid);
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
