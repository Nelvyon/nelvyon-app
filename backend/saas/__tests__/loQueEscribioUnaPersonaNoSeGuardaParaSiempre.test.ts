/**
 * Lo que una persona le escribió a un agente no se guarda para siempre.
 *
 * ── LO QUE HABÍA ────────────────────────────────────────────────────────────
 *
 * `saas_agent_runs` no caducaba. No por decisión: porque no existía ninguna
 * purga, ni para esta tabla ni para ninguna otra del árbol. «Para siempre» acaba
 * siendo la política de cualquier sistema al que nadie le fija una.
 *
 * ── LO QUE SE FIJA AQUÍ ─────────────────────────────────────────────────────
 *
 * Dos etapas, porque lo que se conserva son dos cosas con vidas distintas: lo
 * que escribió una persona (90 días) y el rastro de que la ejecución existió
 * (2 años). Borrar todo a los 90 perdería la auditoría; conservar el texto dos
 * años guardaría datos personales mucho más allá de su utilidad.
 *
 * Se comprueba sobre el SQL que sale, no sobre una base real, porque lo que
 * puede romperse en silencio es justamente eso: un `UPDATE` que se convierte en
 * `DELETE`, un plazo que se cambia sin querer, o una purga sin tope que bloquea
 * la tabla y acaba desactivada.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it, vi } from "vitest";

import {
  DIAS_DE_METADATOS,
  DIAS_DE_TEXTO,
  TOPE_POR_PASADA,
  aplicarRetencionDeEjecuciones,
} from "../loQueCaducaDeUnaEjecucion";

/** Una base que apunta lo que se le pide y devuelve las filas que se le digan. */
function baseQueApunta(devuelve: Record<string, unknown>[][] = [[], []]) {
  let turno = 0;
  const consultas: Array<{ sql: string; params: unknown[] }> = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    consultas.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
    return (devuelve[turno++] ?? []) as never;
  });
  return { query, consultas };
}

const laDe = (base: ReturnType<typeof baseQueApunta>, re: RegExp) =>
  base.consultas.find((c) => re.test(c.sql));

describe("el texto caduca antes que el rastro", () => {
  it("a los 90 días se quita el texto, y la fila SIGUE", async () => {
    const base = baseQueApunta();
    await aplicarRetencionDeEjecuciones(base as never);

    const anonimiza = laDe(base, /^UPDATE saas_agent_runs/i);
    expect(anonimiza, "no se anonimiza nada: el texto se guardaría para siempre").toBeDefined();
    expect(anonimiza!.sql).toMatch(/input = NULL/i);
    expect(anonimiza!.sql).toMatch(/output = NULL/i);
    expect(
      anonimiza!.params,
      "el plazo del texto dejó de ser el decidido",
    ).toContain(String(DIAS_DE_TEXTO));
    expect(
      anonimiza!.sql,
      "se está BORRANDO la fila donde solo había que quitarle el texto",
    ).not.toMatch(/DELETE/i);
  });

  it("a los 2 años se retira la fila entera", async () => {
    const base = baseQueApunta();
    await aplicarRetencionDeEjecuciones(base as never);

    const borra = laDe(base, /^DELETE FROM saas_agent_runs/i);
    expect(borra, "nada se retira nunca: la tabla crece sin fin").toBeDefined();
    expect(borra!.params).toContain(String(DIAS_DE_METADATOS));
  });

  it("el plazo del texto es MENOR que el del rastro", () => {
    // Si se invirtieran, se estaría borrando la auditoría y conservando el dato
    // personal, que es exactamente al revés de lo que se decidió.
    expect(DIAS_DE_TEXTO).toBeLessThan(DIAS_DE_METADATOS);
  });
});

describe("una purga que estorba se acaba desactivando", () => {
  it("las dos etapas van acotadas por un tope", async () => {
    const base = baseQueApunta();
    await aplicarRetencionDeEjecuciones(base as never);
    for (const c of base.consultas) {
      expect(c.sql, `esta sentencia no tiene tope: ${c.sql.slice(0, 60)}`).toMatch(/LIMIT/i);
      expect(c.params).toContain(TOPE_POR_PASADA);
    }
  });

  it("no se toca lo que ya está anonimizado", async () => {
    // Sin esta condición, cada pasada reescribiría las mismas filas viejas para
    // dejarlas igual: trabajo infinito sobre datos que ya caducaron.
    const base = baseQueApunta();
    await aplicarRetencionDeEjecuciones(base as never);
    expect(laDe(base, /^UPDATE saas_agent_runs/i)!.sql).toMatch(
      /input IS NOT NULL OR output IS NOT NULL/i,
    );
  });
});

describe("se dice cuánto se tocó", () => {
  it("devuelve el recuento de las dos etapas", async () => {
    // «Cero» tiene que poder distinguirse de «no se ejecutó»: una purga
    // silenciosa no se puede auditar, y es la que deja de correr sin que nadie
    // se entere.
    const base = baseQueApunta([[{ id: "a" }, { id: "b" }], [{ id: "c" }]]);
    const r = await aplicarRetencionDeEjecuciones(base as never);
    expect(r).toEqual({ anonimizadas: 2, eliminadas: 1 });
  });
});
