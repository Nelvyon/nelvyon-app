/**
 * LAS CUENTAS DEL CLIENTE: qué hace falta, para qué, y en qué estado está.
 *
 * No dispara OAuth. Declara qué accesos necesita cada servicio contratado y
 * permite al cliente decir que NO a alguno — que es una respuesta legítima y
 * hay que poder registrarla. Perseguir para siempre algo que ya ha dicho que no
 * da es la forma más rápida de que deje de leer los avisos.
 *
 * Cada conexión lleva su `paraQue` en el idioma del cliente. Pedir acceso a las
 * cuentas de alguien sin explicar para qué es la forma más rápida de que diga
 * que no a todo.
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
    const conexiones = await getCicloDelCliente().conexionesDe(
      claims.workspaceId,
      claims.clientId,
    );
    return NextResponse.json({
      conexiones,
      pendientes: conexiones.filter((c) => c.estado === "necesaria" || c.estado === "invitada")
        .length,
    });
  } catch (e: unknown) {
    return portalErrorResponse(e, "no se pudieron listar las conexiones");
  }
}

export async function POST(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  let body: { proveedor?: unknown; accion?: unknown; motivo?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "el cuerpo no es JSON válido" }, { status: 400 });
  }

  const proveedor = typeof body.proveedor === "string" ? body.proveedor.trim() : "";
  if (!proveedor) return NextResponse.json({ error: "falta proveedor" }, { status: 400 });

  // Sólo se admite rechazar. Conectar de verdad exige OAuth con credenciales
  // reales y no se hace desde aquí: una ruta que dijera "conectada" sin que lo
  // esté produciría un servicio que cree tener acceso y no lo tiene.
  if (body.accion !== "rechazar") {
    return NextResponse.json(
      {
        error:
          "acción no soportada; conectar se hace por el flujo de autorización del proveedor",
      },
      { status: 400 },
    );
  }

  try {
    await getCicloDelCliente().rechazarConexion(
      claims.workspaceId,
      claims.clientId,
      proveedor,
      typeof body.motivo === "string" ? body.motivo : undefined,
    );
    return NextResponse.json({ proveedor, estado: "rechazada" });
  } catch (e: unknown) {
    return portalErrorResponse(e, "no se pudo actualizar la conexión");
  }
}
