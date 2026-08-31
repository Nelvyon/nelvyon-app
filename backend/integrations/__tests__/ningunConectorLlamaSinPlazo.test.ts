/**
 * NINGUN CONECTOR LLAMA A UN PROVEEDOR SIN PLAZO.
 *
 * ── EL DEFECTO ──────────────────────────────────────────────────────────────
 *
 * Los doce servicios de `backend/integrations` resolvian su `fetch` asi:
 *
 *     return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
 *
 * `fetch` NO tiene plazo por defecto. Si el proveedor acepta la conexion y no
 * responde, la promesa se queda esperando y con ella el trabajador que la
 * lanzo. No da error, no reintenta, no sale en ningun registro como fallo:
 * simplemente deja de avanzar.
 *
 * Y no era que faltara la herramienta. `fetchWithTimeout` existe en este arbol
 * con ese comentario escrito —«prevents cron/worker hangs on slow upstreams»— y
 * OCHO servicios de `backend/saas` ya lo usaban. Los de `backend/integrations`
 * se quedaron sin migrar y nadie lo comprobaba.
 *
 * ── POR QUE SE MIDE LEYENDO EL ARBOL Y NO LLAMANDO ──────────────────────────
 *
 * Probar el plazo de verdad exigiria un servidor que acepte y no conteste, y
 * esperar. Lo que hay que impedir es mas simple y mas general: que un conector
 * NUEVO nazca llamando a `globalThis.fetch`. Eso se ve leyendo, y se ve para
 * los doce a la vez.
 *
 * COSTE EXTERNO: 0 EUR. No se abre ninguna conexion.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve(__dirname, "..");

/** Los ficheros de conector, descubiertos: una lista a mano envejeceria. */
function conectores(): Array<{ nombre: string; fuente: string }> {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
    .map((f) => ({ nombre: f, fuente: fs.readFileSync(path.join(DIR, f), "utf8") }));
}

/**
 * Quita los comentarios antes de juzgar.
 *
 * SIN ESTO LA PRUEBA SE ACUSA A SI MISMA. Los once conectores llevan ahora un
 * comentario que EXPLICA el defecto —dice el nombre de la funcion que ya no
 * usan— y la primera version los marcaba a los once por mencionarlo.
 *
 * Es el mismo error que un detector de secretos que salta con su propia lista
 * de patrones. Lo que se busca son llamadas, no menciones.
 */
function soloCodigo(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

describe("ningun conector llama sin plazo", () => {
  it("EL DENOMINADOR: hay conectores que auditar", () => {
    // Sin esto, un `readdir` sobre la carpeta equivocada devolveria cero
    // ficheros y la comprobacion de abajo pasaria sin mirar nada.
    expect(conectores().length).toBeGreaterThanOrEqual(10);
  });

  it("LA REGLA: ninguno resuelve su fetch con `globalThis.fetch`", () => {
    const crudos = conectores()
      .filter((c) => /globalThis\.fetch/.test(soloCodigo(c.fuente)))
      .map((c) => c.nombre);
    expect(
      crudos,
      "estos conectores llaman al proveedor sin plazo: si no contesta, el " +
        "trabajador se queda esperando para siempre y sin dejar rastro",
    ).toEqual([]);
  });

  it("y los que salen a la red usan `fetchWithTimeout`", () => {
    /**
     * La regla de arriba prohibe lo malo; esta exige lo bueno. Sin las dos, un
     * conector podria dejar de usar `globalThis.fetch` sustituyendolo por
     * cualquier otra cosa igual de indefinida.
     *
     * Solo se juzga a los que salen a la red: hay adaptadores que solo
     * transforman datos y no tienen a quien llamar.
     */
    const salenALaRed = conectores().filter((c) =>
      /this\.fetchImpl|fetchFn/.test(soloCodigo(c.fuente)),
    );
    expect(salenALaRed.length, "ningun conector parece salir a la red").toBeGreaterThanOrEqual(10);

    const sinPlazo = salenALaRed
      .filter((c) => !/fetchWithTimeout/.test(soloCodigo(c.fuente)))
      .map((c) => c.nombre);
    expect(sinPlazo, "estos salen a la red y no usan `fetchWithTimeout`").toEqual([]);
  });

  it("EL CONTROL de `soloCodigo`: una mencion no cuenta, una llamada sí", () => {
    // Las dos mitades. Si `soloCodigo` se tragara tambien el codigo, la regla
    // de arriba pasaria siempre; si no quitara los comentarios, marcaria a los
    // once conectores por explicar en su comentario lo que ya no hacen.
    const soloMencion = "/* antes: globalThis.fetch */\nreturn fetchWithTimeout;";
    expect(/globalThis\.fetch/.test(soloCodigo(soloMencion))).toBe(false);
    const llamadaReal = "return globalThis.fetch.bind(globalThis);";
    expect(/globalThis\.fetch/.test(soloCodigo(llamadaReal))).toBe(true);
  });

  it("EL CONTROL POSITIVO: la regla reconoce un conector mal escrito", () => {
    /**
     * Sin esto, una expresion mal escrita devolveria siempre cero coincidencias
     * y esta suite aprobaria para siempre sin mirar. Es el mismo fallo que
     * tuvieron los cuatro guardianes de RLS.
     */
    const malo = "return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);";
    expect(/globalThis\.fetch/.test(malo)).toBe(true);
  });

  it("EL CONTROL NEGATIVO: y no marca uno bien escrito", () => {
    const bueno = "return this.deps.fetchFn ?? fetchWithTimeout;";
    expect(/globalThis\.fetch/.test(bueno)).toBe(false);
    expect(/fetchWithTimeout/.test(bueno)).toBe(true);
  });

  it("el plazo por defecto sigue siendo el declarado", async () => {
    // Es el contrato con todos los que llaman sin decir plazo. Si alguien lo
    // subiera a diez minutos, «tiene plazo» dejaria de significar gran cosa.
    const { EXTERNAL_FETCH_TIMEOUT_MS } = await import("../../http/fetchWithTimeout");
    expect(EXTERNAL_FETCH_TIMEOUT_MS).toBe(30_000);
  });
});
