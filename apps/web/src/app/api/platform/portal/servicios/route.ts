/**
 * Los servicios que el cliente puede pedir, y pedir uno.
 *
 * PEDIR NO ES COMPRAR. El cliente dice qué necesita; NELVYON responde con
 * alcance y precio. El precio es una decisión comercial y esta ruta no la toma:
 * lo que hace es que la petición exista, quede registrada con su motivo y no se
 * pierda en un correo, que es donde se perdía.
 */
import { NextResponse } from "next/server";

import { getCicloDelCliente } from "@/lib/portal/cicloDelClienteBff";
import { portalBffDynamic, portalDbGuard, portalErrorResponse } from "@/lib/portal/portalBffCommon";
import { requirePortalClaims } from "@/lib/portal/portalJwtAuth";
import { OS_PREMIUM_SERVICE_IDS } from "@nelvyon/os-agents/constants";
import { CONEXIONES_POR_SERVICIO } from "../../../../../../../../backend/portal/CicloDelClienteService";

export const { dynamic, runtime } = portalBffDynamic;

export async function GET(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  try {
    const mias = await getCicloDelCliente().solicitudesDe(claims.workspaceId, claims.clientId);
    const pedidos = new Set(
      mias.filter((s) => !["rechazado", "cancelado"].includes(s.estado)).map((s) => s.serviceId),
    );

    return NextResponse.json({
      // El catálogo sale de `constants.ts`, no de una lista escrita aquí: un
      // servicio nuevo aparece solo, y ninguno se queda fuera por olvido.
      catalogo: OS_PREMIUM_SERVICE_IDS.map((id) => ({
        serviceId: id,
        // Qué cuentas va a pedir. Decirlo ANTES de que lo pida evita la
        // sorpresa de descubrirlo tres semanas después.
        conexionesQueNecesita: (CONEXIONES_POR_SERVICIO[id] ?? []).map((c) => c.proveedor),
        yaPedido: pedidos.has(id),
      })),
      solicitudes: mias,
    });
  } catch (e: unknown) {
    return portalErrorResponse(e, "no se pudo listar el catálogo");
  }
}

export async function POST(req: Request) {
  const claims = requirePortalClaims(req);
  if (claims instanceof NextResponse) return claims;
  const dbGuard = portalDbGuard();
  if (dbGuard) return dbGuard;

  let body: { serviceId?: unknown; motivo?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "el cuerpo no es JSON válido" }, { status: 400 });
  }

  const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
  if (!serviceId) {
    return NextResponse.json({ error: "falta serviceId" }, { status: 400 });
  }

  try {
    const r = await getCicloDelCliente().pedirServicio({
      workspaceId: claims.workspaceId,
      clientId: claims.clientId,
      serviceId,
      solicitadaPor: `portal:${claims.portalUserId}`,
      motivo: typeof body.motivo === "string" ? body.motivo : undefined,
    });

    // Un doble clic no crea dos peticiones y tampoco produce un error: devuelve
    // la que ya había. Para el cliente, pedir dos veces lo mismo debe verse
    // como pedirlo una.
    return NextResponse.json(
      { id: r.id, yaExistia: r.yaExistia },
      { status: r.yaExistia ? 200 : 201 },
    );
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ErrorDelCiclo") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return portalErrorResponse(e, "no se pudo registrar la solicitud");
  }
}
