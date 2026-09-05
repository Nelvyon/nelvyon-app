/**
 * Un almacen sin nada indexado lo dice, en vez de parecer una busqueda sin exito.
 *
 * ── LAS DOS COSAS QUE SE PARECIAN DEMASIADO ─────────────────────────────────
 *
 *   · «he buscado y no hay coincidencias»  → un resultado legitimo
 *   · «no hay NADA que buscar»             → una averia
 *
 * Las dos devolvian `chunks: []`. Y no es teorico: nada escribe en
 * `nelvyon_rag_chunks` —los roles del web solo tienen SELECT— y `UnifiedRagStore`
 * CAE a este almacen cuando el recuperador local certificado no esta disponible.
 * Ese camino de respaldo se quedaba sin conocimiento sin que nadie se enterara:
 * el agente no falla, contesta peor.
 *
 * Es la misma distincion que Fase 1 dejo escrita para la calidad: NO APLICA no
 * es lo mismo que NO SE PUDO COMPROBAR, y ninguna de las dos es FALLA.
 *
 * COSTE EXTERNO: 0 EUR. La base es un doble.
 */
import { describe, expect, it } from "vitest";

import { NelvyonRagStore } from "../NelvyonRagStore";
import { consultaFalsaCon } from "../../../db/__tests__/consultaFalsa";

/** Una base que responde segun lo que se le pregunte. */
function base(opciones: { trozos?: Record<string, unknown>[]; total: number }) {
  return {
    query: consultaFalsaCon((sql) => {
      if (/COUNT\(\*\)/i.test(sql)) return [{ c: String(opciones.total) }];
      return opciones.trozos ?? [];
    }),
  };
}

const TROZO = {
  id: "c1",
  source: "docs/README.md",
  title: "Como funciona",
  content: "NELVYON orquesta agentes",
  tags: ["nelvyon"],
};

describe("el almacen distingue vacio de sin coincidencias", () => {
  it("EL CONTROL: con conocimiento y coincidencia, devuelve el trozo", async () => {
    // Sin este control, un almacen que no devolviera nunca nada pasaria las dos
    // pruebas de abajo y el sistema se quedaria sin RAG.
    const store = new NelvyonRagStore(base({ trozos: [TROZO], total: 12 }) as never);
    const r = await store.searchPlatform("agentes");
    expect(r.chunks).toHaveLength(1);
    expect(r.vacio, "hubo resultados y aun asi se declara vacio").toBe(false);
  });

  it("con conocimiento pero SIN coincidencias, no se declara vacio", async () => {
    // Este es el resultado legitimo: hay conocimiento, la pregunta no encaja.
    const store = new NelvyonRagStore(base({ trozos: [], total: 12 }) as never);
    const r = await store.searchPlatform("algo que no esta");
    expect(r.chunks).toEqual([]);
    expect(r.vacio, "confundio «no encaja» con «no hay nada»").toBe(false);
  });

  it("SIN conocimiento indexado, lo dice", async () => {
    // La averia. Antes era indistinguible de la prueba de arriba.
    const store = new NelvyonRagStore(base({ trozos: [], total: 0 }) as never);
    const r = await store.searchPlatform("cualquier cosa");
    expect(r.chunks).toEqual([]);
    expect(r.vacio, "un almacen vacio sigue pareciendo una busqueda sin exito").toBe(true);
  });

  it("no cuenta la tabla cuando ya hubo resultados", async () => {
    // Contar en cada busqueda seria pagar un COUNT por consulta para responder
    // algo que los propios resultados ya contestan.
    const db = base({ trozos: [TROZO], total: 12 });
    const store = new NelvyonRagStore(db as never);
    await store.searchPlatform("agentes");
    const consultas = db.query.mock.calls.map((c) => String(c[0])).join(" | ");
    expect(consultas, "conto la tabla habiendo encontrado resultados").not.toMatch(/COUNT\(\*\)/i);
  });

  it("una consulta vacia no toca la base", async () => {
    const db = base({ trozos: [], total: 0 });
    const store = new NelvyonRagStore(db as never);
    const r = await store.searchPlatform("   ");
    expect(r.chunks).toEqual([]);
    expect(db.query.mock.calls.length, "consulto la base sin nada que buscar").toBe(0);
  });
});
