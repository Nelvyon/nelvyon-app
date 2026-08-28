/**
 * La guarda de gasto, puesta donde se gasta.
 *
 * Envuelve `GuardaDeGasto` para que una ruta que lanza campañas pueda
 * protegerse en tres líneas y no en treinta. La lógica de decidir no está aquí:
 * está en `guardaDeGasto.ts` y se prueba entera sin llamar a nadie.
 *
 * QUÉ CAMBIA PARA QUIEN YA USABA LA RUTA. Hasta ahora, tener sesión bastaba
 * para crear una campaña con presupuesto real. A partir de aquí hace falta una
 * autorización aprobada. Es un cambio de comportamiento deliberado y la
 * respuesta lo dice con todas las letras: un 403 con el motivo exacto, no un
 * error genérico. Romper en silencio sería peor que no proteger.
 */

import { DbClient } from "../db/DbClient";
import { GuardaDeGasto, type PeticionDeGasto, type Veredicto } from "./guardaDeGasto";

export interface ContextoDeGasto {
  tenantId: string | null;
  workspaceId: number | null;
  serviceId: string;
  proveedor: string;
  actor: string;
  operacion: string;
  importeCents: number;
  idempotencyKey: string;
}

export type ResultadoDePuerta =
  | { permitido: true; peticion: PeticionDeGasto; autorizacionId: string; yaEjecutado: boolean; referenciaExterna: string | null; guarda: GuardaDeGasto }
  | { permitido: false; estado: number; cuerpo: { error: string; motivo: string; detalle: string } };

let guardaCompartida: GuardaDeGasto | null = null;

export function obtenerGuardaDeGasto(): GuardaDeGasto {
  if (!guardaCompartida) guardaCompartida = new GuardaDeGasto(DbClient.getInstance());
  return guardaCompartida;
}

export function reiniciarGuardaParaPruebas(): void {
  guardaCompartida = null;
}

/**
 * Decide si esta petición puede gastar. Sin inquilino o sin workspace deniega:
 * un gasto que no se puede atribuir a nadie no se autoriza, porque después no
 * hay a quién cobrárselo ni a quién avisar.
 */
export async function comprobarPuertaDeGasto(ctx: ContextoDeGasto): Promise<ResultadoDePuerta> {
  if (!ctx.tenantId || ctx.workspaceId === null) {
    return {
      permitido: false,
      estado: 403,
      cuerpo: {
        error: "Gasto externo denegado",
        motivo: "sin_atribucion",
        detalle:
          "la peticion no lleva inquilino ni workspace; un gasto que no se puede atribuir no se autoriza",
      },
    };
  }

  const peticion: PeticionDeGasto = {
    tenantId: ctx.tenantId,
    workspaceId: ctx.workspaceId,
    serviceId: ctx.serviceId,
    proveedor: ctx.proveedor,
    actor: ctx.actor,
    operacion: ctx.operacion,
    importeCents: ctx.importeCents,
    idempotencyKey: ctx.idempotencyKey,
  };

  const guarda = obtenerGuardaDeGasto();
  const veredicto: Veredicto = await guarda.autorizar(peticion);

  if (!veredicto.permitido) {
    await guarda.registrarDenegacion(peticion, veredicto);
    return {
      permitido: false,
      // 403 y no 400: la peticion es correcta, lo que falta es el permiso.
      estado: 403,
      cuerpo: {
        error: "Gasto externo denegado",
        motivo: veredicto.motivo,
        detalle: veredicto.detalle,
      },
    };
  }

  return {
    permitido: true,
    peticion,
    autorizacionId: veredicto.autorizacionId,
    yaEjecutado: veredicto.yaEjecutado,
    referenciaExterna: veredicto.referenciaExterna,
    guarda,
  };
}
