/**
 * Los slugs del catalogo de service packs.
 *
 * DE DONDE SALE ESTE FICHERO
 * --------------------------
 * `e2e/local-pack-smoke.spec.ts` afirmaba esta propiedad contra
 * `/api/os/packs/catalog`. Al auditar el unico `skipped` de la suite E2E resulto
 * que la ruta no existia: el test se saltaba con 404 porque su condicion de
 * salto metia 404 y 410 en el mismo saco que 401 y 403. Nunca llego a comprobar
 * nada.
 *
 * La ruta ya existe y el salto se estrecho a los codigos de autenticacion, pero
 * ese E2E corre sin credenciales de plataforma, asi que en la practica seguira
 * saltandose. Una propiedad que solo se afirma donde no puede ejecutarse no esta
 * cubierta. Aqui se afirma donde si corre: sobre el catalogo, siempre.
 */
import { describe, expect, it } from "vitest";
import { SERVICE_PACK_CATALOG } from "../servicePacksCatalog";

const PACKS_NUEVOS = [
  "social-calendar-pack",
  "content-strategy-pack",
  "cro-audit-pack",
  "analytics-setup-pack",
  "brand-voice-pack",
];

/** Un slug tiene que poder ir en una URL sin escapar nada. */
const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("catalogo de service packs", () => {
  it("el catalogo no esta vacio", () => {
    // Sin esto, un catalogo vacio pasaria todos los `every` de abajo.
    expect(SERVICE_PACK_CATALOG.length).toBeGreaterThan(5);
  });

  it.each(PACKS_NUEVOS)("%s esta en el catalogo con un slug valido", (id) => {
    const pack = SERVICE_PACK_CATALOG.find((p) => p.id === id);
    expect(pack, `${id} no esta en SERVICE_PACK_CATALOG`).toBeDefined();
    expect(pack!.slug).toMatch(SLUG_VALIDO);
  });

  it("ningun pack tiene slug vacio o con formato invalido", () => {
    const malos = SERVICE_PACK_CATALOG.filter((p) => !SLUG_VALIDO.test(p.slug ?? ""));
    expect(malos.map((p) => `${p.id}: ${p.slug}`)).toEqual([]);
  });

  it("no hay dos packs con el mismo slug", () => {
    // Dos packs con el mismo slug hacen que una URL apunte a dos cosas y que
    // cual gane dependa del orden del array.
    const vistos = new Map<string, string>();
    const choques: string[] = [];
    for (const p of SERVICE_PACK_CATALOG) {
      const previo = vistos.get(p.slug);
      if (previo) choques.push(`${p.slug}: ${previo} y ${p.id}`);
      else vistos.set(p.slug, p.id);
    }
    expect(choques).toEqual([]);
  });

  it("no hay dos packs con el mismo id", () => {
    const ids = SERVICE_PACK_CATALOG.map((p) => p.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("toda disponibilidad es uno de los tres valores del tipo", () => {
    const validas = new Set(["available", "beta", "coming_soon"]);
    const raras = SERVICE_PACK_CATALOG.filter((p) => !validas.has(p.availability));
    expect(raras.map((p) => `${p.id}: ${p.availability}`)).toEqual([]);
  });
});
