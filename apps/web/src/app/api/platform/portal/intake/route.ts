/**
 * LO QUE NELVYON NECESITA SABER, y la respuesta del cliente.
 *
 * `IntakeFormService` existía desde hacía tiempo, pero vivía en `/api/os/intake`
 * —el plano interno—, así que quien rellenaba el intake era alguien de NELVYON.
 * Esta ruta le da la cara al cliente y escribe en el cerebro de negocio.
 *
 * Sólo se piden las preguntas que le tocan a ÉL. Las que debemos deducir
 * nosotros —sus palabras clave, sus audiencias— no son suyas: pedírselas es
 * pedirle que haga nuestro trabajo.
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

  const serviceId = new URL(req.url).searchParams.get("serviceId") ?? undefined;

  try {
    const r = await getCicloDelCliente().preguntasPendientes(
      claims.workspaceId,
      claims.clientId,
      serviceId,
    );
    return NextResponse.json(r);
  } catch (e: unknown) {
    return portalErrorResponse(e, "no se pudieron obtener las preguntas");
  }
}

export async function POST(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  let body: { respuestas?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "el cuerpo no es JSON válido" }, { status: 400 });
  }

  if (!Array.isArray(body.respuestas) || body.respuestas.length === 0) {
    return NextResponse.json({ error: "falta `respuestas`" }, { status: 400 });
  }

  const respuestas: Array<{ dimension: string; valor: Record<string, unknown> }> = [];
  for (const r of body.respuestas) {
    const o = r as { dimension?: unknown; valor?: unknown };
    if (typeof o.dimension !== "string" || typeof o.valor !== "object" || o.valor === null) {
      return NextResponse.json(
        { error: "cada respuesta necesita `dimension` y `valor` como objeto" },
        { status: 400 },
      );
    }
    respuestas.push({ dimension: o.dimension, valor: o.valor as Record<string, unknown> });
  }

  try {
    const r = await getCicloDelCliente().contestar({
      workspaceId: claims.workspaceId,
      clientId: claims.clientId,
      respuestas,
      quien: `portal:${claims.portalUserId}`,
    });
    return NextResponse.json(r);
  } catch (e: unknown) {
    // Intentar escribir una dimensión que no le toca al cliente —sus propios
    // resultados, su analítica— es 403 y no 500: la petición está bien formada,
    // lo que no puede es hacerse.
    if (e instanceof Error && e.name === "ErrorDelCiclo") {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof Error && e.name === "ErrorDeCerebro") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return portalErrorResponse(e, "no se pudieron guardar las respuestas");
  }
}
