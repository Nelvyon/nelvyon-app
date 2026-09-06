/**
 * Cuánto tiempo se guarda lo que una persona le escribió a un agente.
 *
 * ── LO QUE HABÍA ────────────────────────────────────────────────────────────
 *
 * `saas_agent_runs` se guardaba PARA SIEMPRE. No por decisión: porque no existía
 * ninguna purga, ni para esta tabla ni para ninguna otra del árbol. «Para
 * siempre» acaba siendo la política de cualquier sistema al que nadie le fija
 * una, y es la única que no se puede defender ante una petición de supresión.
 *
 * ── LAS DOS ETAPAS, Y POR QUÉ SON DOS ───────────────────────────────────────
 *
 * Lo que se conserva no es una cosa, son dos, y caducan a ritmos distintos:
 *
 *   · QUÉ ESCRIBIÓ UNA PERSONA — la vista previa redactada y su huella. Valor
 *     de depuración altísimo la primera semana y prácticamente nulo al mes:
 *     nadie depura un fallo de hace ocho meses con 280 caracteres. Es además lo
 *     único de esta tabla que es dato personal. A los 90 DÍAS se borra.
 *
 *   · QUÉ PASÓ — agente, estado, error, fechas. No dice qué escribió nadie, y
 *     es lo que contesta a «¿este agente se ejecutó, cuándo y cómo acabó?», que
 *     es la pregunta de una auditoría. Se conserva 2 AÑOS.
 *
 * Borrar la fila entera a los 90 días perdería la trazabilidad; conservar el
 * texto dos años guardaría datos personales mucho más allá de su utilidad. Las
 * dos etapas evitan elegir entre auditoría y privacidad.
 *
 * ── ANONIMIZAR NO ES BORRAR A MEDIAS ────────────────────────────────────────
 *
 * En la primera etapa la fila SIGUE, con su texto a NULL. `NULL` aquí significa
 * «caducó», no «vino vacío», y por eso se distingue de la cadena vacía que deja
 * una ejecución sin entrada. Un export que encuentre `NULL` sabe que hubo algo
 * y que ya no está, en vez de creer que nunca lo hubo.
 *
 * ── NO DECIDE CUÁNDO SE EJECUTA ─────────────────────────────────────────────
 *
 * Esto sólo dice QUÉ caduca y CUÁNDO. Quién lo dispara es un cron, y el cron
 * puede no correr: por eso las sentencias son idempotentes y acotadas, y volver
 * a pasarlas dos veces el mismo día no hace nada distinto de pasarlas una.
 *
 * DECISIÓN DE NEGOCIO, TOMADA POR DANIEL el 2026-09-06: 90 días el texto, 2 años
 * los metadatos. No se cambia sin que la cambie una persona.
 */
import type { ConexionSql } from "../db/ConexionSql";

/** Días que sobrevive la vista previa de lo que escribió una persona. */
export const DIAS_DE_TEXTO = 90;

/** Días que sobrevive el rastro de que la ejecución existió. */
export const DIAS_DE_METADATOS = 730;

/** Cuántas filas se tocan como mucho en una pasada. */
export const TOPE_POR_PASADA = 5000;

export type ResultadoDeRetencion = {
  /** Filas a las que se les quitó el texto por haber pasado los 90 días. */
  anonimizadas: number;
  /** Filas eliminadas por haber pasado los 2 años. */
  eliminadas: number;
};

/**
 * Aplica la política. Devuelve cuánto tocó, para que quede en el registro.
 *
 * El orden importa poco —una fila de más de dos años ya no tiene texto— pero se
 * anonimiza primero para que, si la pasada se corta por el tope, lo que quede
 * pendiente sea borrar filas viejas y no seguir guardando texto caducado.
 */
export async function aplicarRetencionDeEjecuciones(
  db: ConexionSql,
): Promise<ResultadoDeRetencion> {
  // ETAPA 1 · el texto caduca a los 90 días.
  //
  // Se acota por `id IN (...)` con tope en vez de un UPDATE abierto: una tabla
  // grande bloquearía media base durante minutos, y una purga que estorba al
  // producto se acaba desactivando.
  const anonimizadas = await db.query<{ id: string }>(
    `UPDATE saas_agent_runs
        SET input = NULL, output = NULL, updated_at = now()
      WHERE id IN (
        SELECT id FROM saas_agent_runs
         WHERE created_at < now() - ($1 || ' days')::interval
           AND (input IS NOT NULL OR output IS NOT NULL)
         ORDER BY created_at
         LIMIT $2
      )
      RETURNING id`,
    [String(DIAS_DE_TEXTO), TOPE_POR_PASADA],
  );

  // ETAPA 2 · la fila entera caduca a los 2 años.
  const eliminadas = await db.query<{ id: string }>(
    `DELETE FROM saas_agent_runs
      WHERE id IN (
        SELECT id FROM saas_agent_runs
         WHERE created_at < now() - ($1 || ' days')::interval
         ORDER BY created_at
         LIMIT $2
      )
      RETURNING id`,
    [String(DIAS_DE_METADATOS), TOPE_POR_PASADA],
  );

  return { anonimizadas: anonimizadas.length, eliminadas: eliminadas.length };
}
