/**
 * Lo que queda GUARDADO de una ejecucion de agente, que no es lo que se le dijo.
 *
 * ── EL PROBLEMA ─────────────────────────────────────────────────────────────
 *
 * `saas_agent_runs` guardaba `input` y `output` en crudo. `input` es texto libre
 * que escribe una persona: ahi acaba lo que pegue, incluida una clave de API que
 * queria que el agente usara, una cabecera `Authorization` copiada de unas
 * herramientas de desarrollo, o los datos de un cliente final.
 *
 * Y no se queda ahi: `SaasUnifiedAuditExportService` los vuelca tal cual en el
 * export de auditoria, asi que un secreto pegado por descuido sale otra vez por
 * una funcion pensada para cumplir.
 *
 * ── QUE SE GUARDA AHORA, Y POR QUE ES SUFICIENTE ────────────────────────────
 *
 * Se midio quien lee esta tabla ANTES de recortar nada:
 *
 *   · la lista de ejecuciones de la interfaz pide `id, agent_id, status,
 *     created_at`. NO usa `input` ni `output` en absoluto;
 *   · el export de auditoria si los usa, para poder contar que hizo el agente.
 *
 * Asi que no se puede vaciar la columna —romperia la auditoria— pero tampoco
 * hace falta el texto entero. Se guarda:
 *
 *   · una VISTA PREVIA redactada y acotada, que basta para reconocer la
 *     ejecucion y auditar que se pidio;
 *   · una HUELLA, que permite agrupar ejecuciones identicas sin conservar el
 *     contenido;
 *   · la LONGITUD original, que es informacion util y no es sensible.
 *
 * ── POR QUE LA HUELLA ES DEL TEXTO YA REDACTADO ─────────────────────────────
 *
 * Es la decision menos obvia. Una huella del texto ORIGINAL permitiria a quien
 * tenga la tabla confirmar un secreto que ya sospeche: prueba a hashear
 * candidatos hasta que cuadre, y los secretos cortos caen. Hasheando lo ya
 * redactado se conserva lo que la huella sirve —agrupar entradas iguales— sin
 * ofrecer ese oraculo.
 *
 * ── LO QUE ESTO NO ES ───────────────────────────────────────────────────────
 *
 * No es cifrado ni anonimizacion. Una vista previa de 280 caracteres de texto
 * escrito por una persona puede seguir conteniendo un nombre. Es MINIMIZACION:
 * se guarda menos, y lo que se guarda pasa por el redactor. La retencion sigue
 * siendo un pendiente declarado.
 */
import { createHash } from "node:crypto";

import { redactar } from "../seguridad/formaDeUnSecreto.mjs";

/**
 * Cuanto se conserva del texto.
 *
 * Suficiente para reconocer de que iba la ejecucion en una auditoria; corto como
 * para que no sea un almacen de lo que la gente escribe.
 */
export const TOPE_DE_VISTA_PREVIA = 280;

export type ResumenPersistible = {
  /** Redactado y acotado. Es lo unico que se guarda del contenido. */
  vistaPrevia: string;
  /** Huella del texto YA REDACTADO, para agrupar sin conservar. */
  huella: string;
  /** Longitud del original. Util y no sensible. */
  longitud: number;
};

/** Lo que se puede guardar de un texto de ejecucion. */
export function resumenPersistible(texto: string | null | undefined): ResumenPersistible {
  const original = typeof texto === "string" ? texto : "";
  const redactado = String(redactar(original));
  const vistaPrevia =
    redactado.length > TOPE_DE_VISTA_PREVIA
      ? `${redactado.slice(0, TOPE_DE_VISTA_PREVIA)}…`
      : redactado;
  return {
    vistaPrevia,
    huella: createHash("sha256").update(redactado, "utf8").digest("hex").slice(0, 32),
    longitud: original.length,
  };
}

/**
 * Lo que va a la columna de texto de `saas_agent_runs`.
 *
 * Se guarda la vista previa con la huella y la longitud detras, en una sola
 * cadena, para no tener que migrar el esquema: el consumidor de auditoria sigue
 * leyendo la misma columna y ve algo mas honesto que antes —sabe que esta viendo
 * un extracto, y no cree que sea el texto completo—.
 */
export function textoPersistible(texto: string | null | undefined): string {
  const r = resumenPersistible(texto);
  if (r.longitud === 0) return "";
  return `${r.vistaPrevia}\n[extracto redactado · ${r.longitud} car. · huella ${r.huella}]`;
}
