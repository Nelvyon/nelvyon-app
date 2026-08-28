/**
 * EL HOME DEL PORTAL, en una sola llamada.
 *
 * Contesta las cuatro preguntas que un cliente tiene al entrar:
 *
 *   ¿Qué está haciendo NELVYON por mí?
 *   ¿Qué he pedido y en qué está?
 *   ¿Qué necesita NELVYON de mí?
 *   ¿Puedo empezar ya o falta algo imprescindible?
 *
 * Van juntas a propósito. Un portal donde hay que navegar para descubrir que
 * falta un dato es un portal donde ese dato no se descubre, y el trabajo se
 * queda parado sin que nadie sepa por qué.
 */
import { NextResponse } from "next/server";

import { getCicloDelCliente } from "@/lib/portal/cicloDelClienteBff";
import { portalBffDynamic, portalDbGuard, portalErrorResponse } from "@/lib/portal/portalBffCommon";
import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";

export const { dynamic, runtime } = portalBffDynamic;

export async function GET(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  try {
    // El alcance sale SIEMPRE de los claims de la sesión, nunca del cuerpo ni
    // de la URL: un identificador de cliente que viaja en la petición es un
    // identificador que el cliente puede cambiar.
    const resumen = await getCicloDelCliente().resumen(claims.workspaceId, claims.clientId);
    return NextResponse.json(resumen);
  } catch (e: unknown) {
    return portalErrorResponse(e, "no se pudo componer el resumen");
  }
}
