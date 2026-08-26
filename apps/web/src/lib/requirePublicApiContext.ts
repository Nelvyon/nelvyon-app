/**
 * Next.js middleware for /api/public/v1/* routes.
 */
import { NextResponse } from "next/server";
import { entrarConInquilino } from "../../../../backend/db/contextoDeInquilino";
import {
  checkPublicApiRateLimit,
  getRateLimitRemaining,
  hasScope,
  resolvePublicApiKey,
} from "../../../../backend/saas/requirePublicApiContext";

export type { PublicApiContext } from "../../../../backend/saas/requirePublicApiContext";

const RATE_LIMIT_PER_MIN = 60;

export type PublicApiResult =
  | { ok: true; ctx: { tenantId: string; scopes: string[]; keyId: string }; rateHeaders: Record<string, string> }
  | { ok: false; response: NextResponse };

export async function requirePublicApiContext(req: Request, requiredScope: string): Promise<PublicApiResult> {
  const authHeader = req.headers.get("authorization") ?? "";
  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!rawKey) {
    return { ok: false, response: NextResponse.json({ error: "Missing Authorization header" }, { status: 401 }) };
  }

  const verified = await resolvePublicApiKey(rawKey);
  if (!verified) {
    return { ok: false, response: NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 }) };
  }

  const { tenantId, scopes } = verified;
  // La identidad de la clave, no una rebanada de la clave.
  //
  // Esto era `rawKey.slice(0, 20)`: `nlv_` mas DIECISEIS caracteres hexadecimales
  // del secreto vivo. Y no se quedaba aqui — viaja a `logUsage(...)`, que lo
  // persiste, y al rastro de auditoria de MCP como identificador de usuario y de
  // clave. El propio servicio guarda un `key_prefix` de DOCE caracteres para la
  // interfaz: se estaba registrando mas clave de la que el producto enseña.
  //
  // No es explotable —quedan 128 bits— pero un trozo de credencial viva en los
  // registros es un trozo de credencial viva en los registros, y la identidad
  // estable de una clave ya existia: su `id`.
  const keyId = verified.keyId;

  const allowed   = checkPublicApiRateLimit(keyId);
  const remaining = getRateLimitRemaining(keyId);
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit":     String(RATE_LIMIT_PER_MIN),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset":     String(Math.ceil((Date.now() + 60_000) / 1000)),
  };

  if (!allowed) {
    return { ok: false, response: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: rateHeaders }) };
  }

  if (!hasScope(scopes, requiredScope)) {
    return {
      ok: false,
      response: NextResponse.json({ error: `Insufficient scope. Required: ${requiredScope}` }, { status: 403, headers: rateHeaders }),
    };
  }

  // Fija el inquilino para el resto de la peticion.
  //
  // Esta es la superficie de API publica: el inquilino no viene de una sesion
  // sino de una CLAVE de API ya validada arriba, con sus scopes y su limite de
  // uso comprobados. Es tan inquilino como el de una sesion, y por eso merece el
  // mismo contexto: son las rutas por las que un cliente automatiza contra
  // NELVYON, y las que menos supervision humana tienen cuando algo se cruza.
  entrarConInquilino({ tenantId });
  return { ok: true, ctx: { tenantId, scopes, keyId }, rateHeaders };
}
