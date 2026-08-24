/**
 * BLOQUE 3 · la visibilidad en IA no se presenta como medida cuando es supuesta.
 *
 * `checkBrandVisibility` NO pregunta a ChatGPT. Le pide al modelo propio de
 * NELVYON que imagine como respondería una IA conversacional, y mide sobre esa
 * respuesta imaginada.
 *
 * Sin decirlo, un `{ platform: "chatgpt", brandMentioned: true }` se lee como
 * «ChatGPT menciona tu marca». No es verdad: hay un modelo local suponiendo. Un
 * cliente que tome decisiones con ese dato las toma con una metrica inventada.
 *
 * Estas pruebas exigen que la verdad viaje CON el dato, no en la documentacion
 * -que nadie lee cuando mira un panel-.
 */
import { describe, expect, it } from "vitest";

import { GeoAiVisibilityService } from "../GeoAiVisibilityService";

/** LLM falso: responde texto fijo, sin red y sin coste. */
const llmFalso = {
  complete: async () =>
    "Para ese tipo de servicio suelo recomendar Marca Alfa y tambien Marca Beta.",
} as never;

function servicio(filas: Array<Record<string, unknown>>) {
  const db = {
    query: async () => filas,
  } as never;
  return new GeoAiVisibilityService({ db, llm: llmFalso } as never);
}

const FILA = {
  id: "chk-1",
  userId: "u1",
  brandName: "Marca Alfa",
  queryUsed: "mejor gestoria para autonomos",
  platform: "chatgpt",
  responseText: "Suelo recomendar Marca Alfa.",
  brandMentioned: true,
  mentionPosition: 1,
  sentiment: "positive",
  checkedAt: "2026-01-01T00:00:00.000Z",
};

describe("BLOQUE 3 · visibilidad en IA", () => {
  it("EL CONTROL: la comprobacion devuelve resultados", async () => {
    // Sin esto, un servicio que devolviera siempre vacio pasaria la prueba de
    // abajo sin que hubiera nada que etiquetar.
    const r = await servicio([FILA]).checkBrandVisibility(
      "u1", "Marca Alfa", "gestorias", ["mejor gestoria para autonomos"],
    );
    expect(r.length).toBe(1);
  });

  it("cada comprobacion se declara SIMULATED", async () => {
    // La propiedad. Un panel que pinte esto sin mirar `estado` seguira
    // mintiendo, pero al menos la mentira deja de estar en el dato.
    const r = await servicio([FILA]).checkBrandVisibility(
      "u1", "Marca Alfa", "gestorias", ["mejor gestoria para autonomos"],
    );
    expect(r[0]!.estado).toBe("SIMULATED");
  });

  it("dice de DONDE salio la respuesta que midio", async () => {
    // "SIMULATED" a secas obliga a preguntar simulado por quien. El origen lo
    // responde sin tener que abrir el codigo.
    const r = await servicio([FILA]).checkBrandVisibility(
      "u1", "Marca Alfa", "gestorias", ["mejor gestoria"],
    );
    expect(r[0]!.origen).toMatch(/NELVYON/i);
    expect(r[0]!.origen).toContain("chatgpt");
  });

  it("`platform` sigue diciendo a QUIEN se imitaba, no quien respondio", async () => {
    const r = await servicio([FILA]).checkBrandVisibility(
      "u1", "Marca Alfa", "gestorias", ["x"], "perplexity",
    );
    expect(r[0]!.origen).toContain("perplexity");
  });

  it("una consulta vacia no genera una comprobacion fantasma", async () => {
    // Medir sobre una consulta vacia produciria un dato que parece una medicion
    // y no corresponde a ninguna pregunta.
    const r = await servicio([FILA]).checkBrandVisibility(
      "u1", "Marca Alfa", "gestorias", ["", "   "],
    );
    expect(r).toHaveLength(0);
  });

  it("ninguna comprobacion se declara EXECUTED ni VERIFIED", async () => {
    // El tipo ya lo impide en compilacion; esto lo fija tambien en ejecucion,
    // que es donde acaban los datos que viajan a un panel.
    const r = await servicio([FILA, FILA]).checkBrandVisibility(
      "u1", "Marca Alfa", "gestorias", ["a"],
    );
    for (const c of r) {
      expect(["EXECUTED", "VERIFIED"]).not.toContain(c.estado);
    }
  });
});
