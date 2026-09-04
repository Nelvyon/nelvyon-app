/**
 * El bloque del Business Brain aparece en el prompt REAL de cada servicio.
 *
 * ── POR QUÉ ESTA PRUEBA Y NO UN GREP ────────────────────────────────────────
 *
 * Al medir la cobertura por los nombres importados salieron tres servicios
 * «fuera» —ads, seo y social— que en realidad SÍ estaban dentro: usan otro
 * `buildPrompt`, el de `webPremiumPrompts`, que también prepone. Un grep sobre
 * imports mide cómo se llaman las cosas, no qué hacen.
 *
 * Así que esto no lee ficheros: COMPONE el prompt de cada servicio con un
 * cerebro reconocible y comprueba que aparece. Si mañana alguien añade una
 * familia de prompts con su propio compositor, esta prueba se pone roja y
 * ninguna cantidad de renombrados la engaña.
 *
 * ── EL FALLO QUE PREVIENE ───────────────────────────────────────────────────
 *
 * Ya pasó con el contexto del encargo: `eliteLote2CommonVars` reconstruía el
 * mapa con los nombres en mayúsculas y descartaba las claves que empiezan por
 * `__`. Doce servicios se quedaron sin presupuesto ni restricciones legales a
 * la vez, y nada falló: los prompts seguían componiéndose perfectamente.
 *
 * COSTE EXTERNO: 0 EUR. No llama a ningún modelo.
 */
import { describe, expect, it } from "vitest";

import { CLAVE_CEREBRO } from "../agents/elitePayloadStrings";

const MARCA = "MARCA-DEL-CEREBRO-DE-ESTE-CLIENTE";

/**
 * Los módulos de prompts, recogidos por el propio empaquetador.
 *
 * Se usa `import.meta.glob` y no `readdirSync` + `import(variable)`: una
 * importación dinámica con plantilla no la resuelve Vite, y la primera versión
 * de esta prueba dio 27 fallos seguidos que no eran del producto sino del
 * arnés. Un arnés roto que acusa a todo el mundo es indistinguible de un
 * producto roto, y cuesta lo mismo creerse el uno que el otro.
 */
const MODULOS_GLOB = import.meta.glob<Record<string, unknown>>(
  "../agents/*PremiumPrompts.ts",
);
const MODULOS = Object.keys(MODULOS_GLOB)
  .map((r) => r.split("/").pop() as string)
  .sort();

/**
 * Módulos cuyas funciones no componen un prompt de servicio.
 *
 * Se declara vacío a propósito: cualquier excepción tendría que justificarse, y
 * hoy no hace falta ninguna.
 */
const SIN_PROMPT_DE_SERVICIO: string[] = [];

describe("ningún servicio se queda sin el cerebro", () => {
  it("EL CONTROL: hay módulos de prompts que mirar", () => {
    // Cero módulos sería un verde vacío.
    expect(MODULOS.length, "no se encontró ningún módulo de prompts").toBeGreaterThanOrEqual(25);
  });

  it.each(MODULOS)("%s prepone el bloque del cerebro", async (fichero) => {
    if (SIN_PROMPT_DE_SERVICIO.includes(fichero)) return;

    const clave = Object.keys(MODULOS_GLOB).find((r) => r.endsWith(`/${fichero}`));
    expect(clave, `no se pudo cargar ${fichero}`).toBeDefined();
    const mod = await MODULOS_GLOB[clave as string]();

    const payload = { [CLAVE_CEREBRO]: MARCA, clientName: "Cliente", industry: "salud" };

    const funciones = Object.entries(mod).filter(
      ([nombre, v]) => typeof v === "function" && /^prompt/i.test(nombre),
    ) as Array<[string, (...a: unknown[]) => unknown]>;

    expect(funciones.length, `${fichero} no exporta ninguna función de prompt`).toBeGreaterThan(0);

    // El payload va SIEMPRE el último; los pasos previos son texto.
    const conCerebro: string[] = [];
    for (const [nombre, fn] of funciones) {
      const args: unknown[] = [];
      for (let i = 0; i < Math.max(fn.length - 1, 0); i += 1) args.push("resultado del paso previo");
      args.push(payload);
      let salida: unknown;
      try {
        salida = fn(...args);
      } catch {
        continue; // firma distinta; otra función del mismo módulo servirá
      }
      if (typeof salida === "string" && salida.includes(MARCA)) conCerebro.push(nombre);
    }

    expect(
      conCerebro.length,
      `ninguna función de ${fichero} prepone el cerebro: ese servicio trabaja sin `
        + `saber nada de su cliente`,
    ).toBeGreaterThan(0);
  });

  it("EL CONTROL NEGATIVO: sin cerebro en el payload, la marca no aparece sola", async () => {
    // Si el compositor inventara texto, todo lo de arriba pasaría por el motivo
    // equivocado.
    const { buildPrompt } = await import("../agents/lote2PromptUtils");
    expect(buildPrompt("cuerpo", {})).not.toContain(MARCA);
  });
});
