/**
 * El bloque de Business Brain que se le pone delante a un agente.
 *
 * ── LO QUE FALTABA ──────────────────────────────────────────────────────────
 *
 * Todas las piezas estaban: `CerebroDeNegocioService` guarda las dimensiones,
 * `dimensionesDeServicio` declara cuáles le tocan a cada uno de los 29
 * servicios, `contextoDeNegocio` compone el texto y `CLAVE_CEREBRO` lo prepone.
 *
 * Y el cerebro no llegaba a NINGÚN agente. Ni siquiera a web, el único que sabía
 * recibirlo: `webPremiumIntakeStrings(payload, cerebro?)` lo tiene como
 * parámetro opcional y ningún llamante se lo pasaba nunca. Cuatro piezas
 * conectadas entre sí y desconectadas de la realidad.
 *
 * Este módulo es el que las enchufa: carga el cerebro del cliente y devuelve el
 * bloque ya compuesto para SU disciplina.
 *
 * ── LA DISTINCIÓN QUE IMPORTA ───────────────────────────────────────────────
 *
 * «No sabemos nada de este cliente» y «no hemos podido preguntarlo» son cosas
 * muy distintas y no pueden acabar en el mismo texto:
 *
 *   · cliente SIN cerebro → se dice explícitamente, con la instrucción de no
 *     inventarse los huecos. `contextoDeNegocio` ya lo hace, y hace falta: un
 *     bloque vacío se lee como «no hay restricciones», que es el peor mensaje
 *     posible para un cliente de un sector regulado.
 *
 *   · FALLO al cargar → se calla. Afirmar «no se sabe nada» cuando la base no
 *     contesta haría que el agente escribiera como si el cliente no tuviera
 *     historia, y puede que tenga seis meses de ella. Un dato falso disfrazado
 *     de dato es peor que un hueco.
 *
 * ── NO TUMBA UNA ENTREGA ────────────────────────────────────────────────────
 *
 * Nunca lanza. Si el cerebro no se puede leer, el agente trabaja como
 * trabajaba antes de que esto existiera —con el contexto del encargo— y queda
 * constancia en los registros de que se quedó sin él.
 */
import { CerebroDeNegocioService } from "../cerebro/CerebroDeNegocioService";
import { DbClient } from "../db/DbClient";

import { contextoDeNegocio } from "./contextoDeNegocio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El workspace del cliente, o `null` si no consta. */
async function workspaceDelCliente(clientId: string): Promise<number | null> {
  if (!UUID.test(clientId)) return null;
  const filas = await DbClient.getInstance().query<{ workspace_id: number | string }>(
    `SELECT workspace_id FROM os_clients WHERE id = $1::uuid LIMIT 1`,
    [clientId],
  );
  const w = filas[0]?.workspace_id;
  const n = typeof w === "number" ? w : typeof w === "string" ? Number(w) : NaN;
  return Number.isInteger(n) ? n : null;
}

/**
 * El bloque de contexto de negocio para este cliente y este servicio.
 *
 * @returns el texto a preponer, o `""` cuando no se ha podido averiguar nada
 *          —que NO es lo mismo que saber que no hay nada—.
 */
export async function bloqueDeCerebro(
  clientId: string,
  serviceId: string,
): Promise<string> {
  try {
    const workspaceId = await workspaceDelCliente(clientId);
    // Sin workspace no se puede leer el cerebro de nadie. Componer el bloque de
    // «cliente sin cerebro» seria afirmar algo que no se ha comprobado.
    if (workspaceId === null) return "";

    const cerebro = await new CerebroDeNegocioService(DbClient.getInstance()).leer(
      workspaceId,
      clientId,
    );
    return contextoDeNegocio(serviceId, cerebro).bloque;
  } catch (e) {
    const { redactar } = await import("../seguridad/formaDeUnSecreto.mjs");
    const crudo = e instanceof Error ? e.message : "desconocido";
    console.warn(
      `[cerebro] ${serviceId} trabaja sin contexto de negocio: `
        + `${String(redactar(crudo)).slice(0, 200)}`,
    );
    return "";
  }
}
