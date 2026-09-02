/**
 * EL PULSO DEL SISTEMA, para quien opera NELVYON.
 *
 * QUÉ CONTESTA: qué lleva parado más tiempo del que debería. Nada más. Todo lo
 * demás —cuántos clientes, cuántos entregables— ya lo enseñan noventa y una
 * pantallas, y ninguna evitó que doce trabajos se quedaran encolados desde
 * junio hasta que alguien los buscó a mano en agosto.
 *
 * POR QUÉ VIVE BAJO `admin/` Y NO BAJO `platform/`, que es la decisión
 * importante de este fichero:
 *
 *     ESTA RUTA ATRAVIESA INQUILINOS A PROPÓSITO.
 *
 * Un operador de NELVYON necesita ver lo que está parado en TODOS los clientes
 * a la vez; ésa es justamente su utilidad. Y eso la convierte en la clase de
 * ruta que, mal protegida, entrega el mapa entero del negocio a cualquiera.
 *
 * De ahí que use `assertAdmin`, que comprueba que la persona es administradora
 * de NELVYON, y no `requirePlatformClaims`, que sólo comprueba que pertenece a
 * ALGÚN workspace. La diferencia entre las dos es la diferencia entre un panel
 * interno y una filtración.
 *
 * Y por eso `SalaDeMaquinas` no recibe ningún inquilino: no es que se le haya
 * olvidado filtrar, es que su trabajo es no filtrar. Un `workspaceId` opcional
 * aquí sería una invitación a llamarla sin él desde una ruta menos protegida.
 */
import { NextResponse } from "next/server";

import { OsAgentError } from "@nelvyon/os-agents";

// CONEXION ENTRE INQUILINOS, no la de la peticion.
//
// Esta ruta esta declarada sin contexto de inquilino a proposito (ver
// `test_las_rutas_web_fijan_el_inquilino`): plano de administracion entre inquilinos.
//
// Con la conexion de peticion funciona hoy solo porque `DATABASE_URL` apunta a
// `postgres`, que salta RLS. El dia que apunte a `nelvyon_web_app` —el plan
// `WEB_DB_ROLE_CUTOVER`— las politicas filtrarian fila a fila y esta ruta NO
// daria error: devolveria CERO FILAS.
//
// `DbJobsClient` cae a `DATABASE_URL` mientras `NELVYON_WEB_JOBS_DATABASE_URL`
// no exista, asi que HOY no cambia ninguna conducta.
import { DbJobsClient } from "@/../../backend/db/DbJobsClient";
import { SalaDeMaquinas } from "@/../../backend/operacion/SalaDeMaquinas";
import { assertAdmin } from "../_utils";

// El pulso es de ahora mismo. Cachearlo sería enseñar un sistema que ya no es.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * `DbClient` se importa arriba de forma ESTÁTICA, no con `require()` perezoso.
 *
 * Veintinueve servicios lo pedían con `require()` y en el bundle de servidor de
 * Next eso devuelve `undefined`: siete rutas devolvían 500 a cualquier cliente
 * nuevo y nadie lo vio porque las pruebas corren sin empaquetar. La puerta de
 * build lo vigila desde entonces.
 */
let sala: SalaDeMaquinas | null = null;

function getSala(): SalaDeMaquinas {
  if (!sala) sala = new SalaDeMaquinas(DbJobsClient.getInstance());
  return sala;
}

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    return NextResponse.json(await getSala().pulso());
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof OsAgentError && e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Un fallo aquí NO devuelve un pulso vacío con 200. Un panel que dice «no
    // hay nada parado» porque la consulta reventó es peor que un panel caído:
    // el caído se ve, el que miente tranquiliza.
    return NextResponse.json(
      { error: "no se pudo medir el pulso del sistema" },
      { status: 503 },
    );
  }
}
