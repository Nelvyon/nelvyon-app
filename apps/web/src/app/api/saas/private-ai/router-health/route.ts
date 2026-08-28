export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasPrivateAiService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

/** Router health + certification status for ops / SaaS settings UI. */
export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    const health = await getSaasPrivateAiService().getRouterHealthStatus();
    return NextResponse.json({
      certified: health.ok === true,
      declaration: health.ok
        ? "ROUTER DE MODELOS NELVYON COMPLETADO"
        : "ROUTER DE MODELOS NELVYON NO SALUDABLE",
      health,
    });
  } catch (e: unknown) {
    // Una ruta de SALUD que devuelve 500 porque el servicio que vigila no esta
    // configurado esta contestando a la pregunta equivocada: "no configurado"
    // es una respuesta valida sobre el estado, no una averia del endpoint.
    //
    // Medido: con `LOCAL_AI_DATABASE_URL` ausente —que es lo normal en
    // cualquier entorno que no tenga la IA local montada— esta ruta era la
    // unica de las 153 de /api/saas que seguia dando 500 tras arreglar los
    // require perezosos. Un 500 aqui hace que la monitorizacion avise de una
    // caida que no existe, y el aviso repetido se acaba ignorando.
    //
    // La autenticacion y los permisos SI conservan su codigo: un 401 o un 403
    // no son un estado de salud, son la respuesta correcta a quien pregunta.
    const estado = saasErrorStatus(e);
    if (estado >= 500) {
      return NextResponse.json(
        {
          certified: false,
          declaration: "ROUTER DE MODELOS NELVYON NO DISPONIBLE",
          health: {
            ok: false,
            reason: e instanceof Error ? e.message : String(e),
          },
        },
        { status: 200 },
      );
    }
    return NextResponse.json(saasErrorBody(e), { status: estado });
  }
}
