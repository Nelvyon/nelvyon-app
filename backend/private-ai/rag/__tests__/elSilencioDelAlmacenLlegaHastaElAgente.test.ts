/**
 * Que el almacén esté vacío tiene que llegar hasta quien pregunta.
 *
 * ── LA MITAD DEL TRABAJO NO SIRVE ───────────────────────────────────────────
 *
 * `NelvyonRagStore` ya distinguía «he buscado y no encaja» de «no hay nada
 * indexado»: devuelve `vacio`. Y nadie lo leía. Un dato que nadie consume es
 * exactamente la misma avería que no tenerlo, con la diferencia de que encima
 * parece resuelta.
 *
 * El camino real es: agente → herramienta MCP `rag.search` → `UnifiedRagStore`
 * → adjunto ILIKE. Hoy `nelvyon_rag_chunks` no lo escribe nadie —es el espejo
 * de lectura que el plan de RAG unificado mantiene hasta el cutover—, así que
 * ese camino devolvía cero trozos y el agente contestaba igual, sin saber que
 * no había dónde mirar. Una respuesta sin conocimiento que parece una respuesta
 * con conocimiento.
 *
 * ── LO QUE SE FIJA AQUÍ ─────────────────────────────────────────────────────
 *
 * Que la señal viaje entera y que NO se dispare cuando no toca: si el
 * recuperador local tiene contenido y la búsqueda no encaja, eso es un
 * resultado legítimo y decir «vacío» sería mentir en la otra dirección.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it, vi } from "vitest";

import { UnifiedRagStore } from "../UnifiedRagStore";

/** Una base que responde lo que se le diga, contando lo que se le pregunta. */
function baseQue(respuestas: { filas: unknown[]; cuenta: number }) {
  return {
    query: vi.fn(async (sql: string) => {
      if (/COUNT\(\*\)/i.test(sql)) return [{ c: String(respuestas.cuenta) }] as never;
      return respuestas.filas as never;
    }),
  };
}

describe("el aviso de almacén vacío llega hasta arriba", () => {
  it("sin nada indexado, la fachada lo dice", async () => {
    // El recuperador local no está en este entorno de prueba, así que la
    // fachada cae al adjunto: es exactamente el camino que se quedaba mudo.
    const store = new UnifiedRagStore(baseQue({ filas: [], cuenta: 0 }) as never);
    const r = await store.searchPlatform("politica de devoluciones");
    expect(r.chunks).toEqual([]);
    expect(
      r.vacio,
      "la fachada perdió el aviso: quien pregunte no sabrá que no hay dónde buscar",
    ).toBe(true);
  });

  it("con contenido indexado que no encaja, NO dice vacío", async () => {
    // La otra mitad, y la que es fácil romper: convertir «no encaja» en «no hay
    // nada» haría que un agente dejara de contestar cuando sí podía.
    const store = new UnifiedRagStore(baseQue({ filas: [], cuenta: 42 }) as never);
    const r = await store.searchPlatform("algo que no está");
    expect(r.chunks).toEqual([]);
    expect(r.vacio, "se declaró vacío un almacén con 42 trozos dentro").not.toBe(true);
  });

  it("con resultados no se pregunta por el recuento", async () => {
    // Si hubo trozos, es que hay algo: contar sería una consulta de más en el
    // camino caliente.
    const base = baseQue({
      filas: [{ id: "1", source: "docs", title: "t", content: "c", tags: [] }],
      cuenta: 0,
    });
    const store = new UnifiedRagStore(base as never);
    const r = await store.searchPlatform("algo");
    expect(r.chunks).toHaveLength(1);
    expect(r.vacio).not.toBe(true);
    const cuentas = base.query.mock.calls.filter(([sql]) => /COUNT\(\*\)/i.test(String(sql)));
    expect(cuentas, "se contó teniendo resultados delante").toHaveLength(0);
  });

  it("una búsqueda vacía no toca la base", async () => {
    const base = baseQue({ filas: [], cuenta: 0 });
    const store = new UnifiedRagStore(base as never);
    await store.searchPlatform("   ");
    expect(base.query).not.toHaveBeenCalled();
  });
});
