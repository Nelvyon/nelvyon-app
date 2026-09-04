/**
 * Cada entrega queda registrada como una ACCIÓN de la que responder.
 *
 * ── EL HUECO ────────────────────────────────────────────────────────────────
 *
 * `MotorDeResultados` cierra el círculo objetivo → línea base → acción →
 * medición → resultado. Está construido, tiene sus tablas (migración 583) y su
 * batería contra PostgreSQL real.
 *
 * Y no lo importaba NADIE. Cero referencias en todo el repositorio fuera de sus
 * propias pruebas. El motor que decide si NELVYON sirve de algo no recibía ni
 * un dato.
 *
 * Sin acciones registradas, `veredicto()` devuelve `desconocido` para siempre —
 * y devolvería `desconocido` con toda la razón, porque efectivamente nadie
 * podría demostrar que una mejora vino de algo que hiciéramos nosotros.
 *
 * ── QUÉ SE REGISTRA, Y QUÉ NO ───────────────────────────────────────────────
 *
 * Se registra la ENTREGA, no el resultado. Una acción es «esto se hizo, a
 * partir de este momento pudo tener efecto». Si sirvió o no lo dirá la medición
 * posterior, y eso es precisamente lo que el motor sabe juzgar.
 *
 * `efectiva_desde` es AHORA porque el trabajo acaba de entregarse. La tabla
 * distingue ese campo de `created_at` a propósito —una campaña creada el lunes
 * y activada el jueves empieza el jueves—, pero para un entregable ambos
 * coinciden: se entrega y ya puede tener efecto.
 *
 * ── POR QUÉ NO ADIVINA EL WORKSPACE ─────────────────────────────────────────
 *
 * `os_acciones.workspace_id` es un entero y el trabajo trae un `clientId`. El
 * enlace está en `os_clients`. Si el cliente no está ahí, NO se registra: meter
 * la acción en el workspace equivocado ensuciaría el veredicto de otro cliente,
 * y un dato en el sitio equivocado es peor que ningún dato.
 */
import { DbClient } from "../db/DbClient";

import { MotorDeResultados } from "./MotorDeResultados";
import { workspaceDelCliente } from "../os-core/workspaceDelCliente";

/**
 * Registra una entrega como acción medible.
 *
 * NUNCA hace fallar el trabajo, por lo mismo que el registro de aprendizaje: el
 * cliente ya tiene su entregable y perderlo por no poder anotarlo sería absurdo.
 * Pero tampoco se traga el fallo en silencio — un motor de resultados que deja
 * de recibir datos y no lo dice es indistinguible de uno que funciona y no
 * encuentra nada que medir.
 */
export async function registrarEntregaComoAccion(params: {
  clientId: string;
  serviceId: string;
  descripcion?: string;
}): Promise<{ registrada: boolean; motivo?: string }> {
  try {
    const workspaceId = await workspaceDelCliente(params.clientId);
    if (workspaceId === null) {
      return { registrada: false, motivo: "el cliente no consta en os_clients" };
    }

    const motor = new MotorDeResultados(DbClient.getInstance());
    await motor.registrarAccion({
      workspaceId,
      clientId: params.clientId,
      descripcion: params.descripcion ?? `entrega de ${params.serviceId}`,
      actor: params.serviceId,
      serviceId: params.serviceId,
      efectivaDesde: new Date(),
    });
    return { registrada: true };
  } catch (e) {
    const { redactar } = await import("../seguridad/formaDeUnSecreto.mjs");
    const crudo = e instanceof Error ? e.message : "desconocido";
    console.warn(
      `[resultados] no se pudo registrar la entrega de ${params.serviceId} como acción: `
        + `${String(redactar(crudo)).slice(0, 200)}`,
    );
    return { registrada: false, motivo: "error al registrar" };
  }
}
