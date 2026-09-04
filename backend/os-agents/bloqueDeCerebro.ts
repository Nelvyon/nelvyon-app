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
import { CerebroDeNegocioService, type Cerebro } from "../cerebro/CerebroDeNegocioService";
import { DbClient } from "../db/DbClient";

import { contextoDeNegocio } from "./contextoDeNegocio";
import { workspaceDelCliente } from "../os-core/workspaceDelCliente";

/**
 * Lo que se saca del cerebro para un trabajo.
 *
 * El BLOQUE va al prompt del agente. El idioma y el mercado van aparte porque
 * los necesita otro: la puerta de calidad los compara con lo que salió escrito.
 * Metidos dentro del bloque no servirían para eso — un texto no se puede
 * comparar con un texto.
 */
export type LoQueSabemosDelCliente = {
  /** El texto a preponer, o `""` si no se ha podido averiguar nada. */
  bloque: string;
  /** En qué idioma escribe este cliente, si consta. */
  idioma: string | null;
  /** En qué mercado vende, si consta. */
  mercado: string | null;
};

/** El valor de una dimensión de forma «texto», si está y no está vacío. */
function textoDe(cerebro: Cerebro, id: string): string | null {
  if (cerebro.caducadas.includes(id)) return null;
  const v = cerebro.dimensiones.get(id)?.valor as { texto?: unknown } | undefined;
  const t = typeof v?.texto === "string" ? v.texto.trim() : "";
  return t.length > 0 ? t : null;
}

export async function bloqueDeCerebro(
  clientId: string,
  serviceId: string,
): Promise<LoQueSabemosDelCliente> {
  const nada: LoQueSabemosDelCliente = { bloque: "", idioma: null, mercado: null };
  try {
    const workspaceId = await workspaceDelCliente(clientId);
    // Sin workspace no se puede leer el cerebro de nadie. Componer el bloque de
    // «cliente sin cerebro» seria afirmar algo que no se ha comprobado.
    if (workspaceId === null) return nada;

    const cerebro = await new CerebroDeNegocioService(DbClient.getInstance()).leer(
      workspaceId,
      clientId,
    );
    return {
      bloque: contextoDeNegocio(serviceId, cerebro).bloque,
      idioma: textoDe(cerebro, "idioma"),
      mercado: textoDe(cerebro, "mercado"),
    };
  } catch (e) {
    const { redactar } = await import("../seguridad/formaDeUnSecreto.mjs");
    const crudo = e instanceof Error ? e.message : "desconocido";
    console.warn(
      `[cerebro] ${serviceId} trabaja sin contexto de negocio: `
        + `${String(redactar(crudo)).slice(0, 200)}`,
    );
    return nada;
  }
}
