/**
 * BLOQUE 3 · el trinquete de la propia puerta.
 *
 * Las suites de certificación del Bloque 3 están condicionadas a
 * `NELVYON_B3_DSN`: sin base, se saltan. Eso es correcto para el día a día, y
 * abre un agujero exacto en el momento que importa:
 *
 *   una PUERTA ejecutada sin el DSN se salta las pruebas, no falla ninguna, y
 *   reporta VERDE.
 *
 * No diría «no certificado»: diría «certificado». Es el mismo agujero que se
 * cerró en el Bloque 2 y por eso este fichero es su gemelo.
 *
 * Vive en `apps/web/src/` a propósito, igual que `laSuiteNoDejaCarpetasFuera`:
 * un guardián que dependa del `include` desaparece cuando alguien lo estrecha,
 * y una suite sin el fichero no falla, simplemente no lo ejecuta.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

function raizDelProyecto(): string {
  let d = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(d, "apps", "web", "vitest.config.ts"))) return d;
    const padre = dirname(d);
    if (padre === d) break;
    d = padre;
  }
  throw new Error("no se encuentra la raiz del proyecto");
}

const RAIZ = raizDelProyecto();
const SUITES = join(RAIZ, "backend", "private-ai", "__tests__");
const ES_PUERTA = process.env.NELVYON_B3_PUERTA === "1";

/** Las suites del bloque que necesitan base: `*.pg.test.ts`. */
function suitesConBase(): string[] {
  try {
    return readdirSync(SUITES).filter((f) => f.endsWith(".pg.test.ts"));
  } catch {
    return [];
  }
}

describe("BLOQUE 3 · la puerta no puede saltarse a si misma", () => {
  it("EL CONTROL: el barrido encuentra las suites del bloque", () => {
    // Sin esto, un cambio de carpeta daria cero suites y las comprobaciones de
    // abajo pasarian sobre una lista vacia.
    expect(readdirSync(SUITES).length).toBeGreaterThan(0);
  });

  it("toda suite con base esta condicionada al MISMO DSN", () => {
    // Si una se condicionara a otra variable, correria o se saltaria por su
    // cuenta y el recuento del bloque dejaria de ser comparable.
    const desviadas = suitesConBase().filter(
      (f) => !readFileSync(join(SUITES, f), "utf8").includes("NELVYON_B3_DSN"),
    );
    expect(desviadas).toEqual([]);
  });

  it("declarada la PUERTA, la base tiene que existir de verdad", () => {
    if (!ES_PUERTA) {
      // Fuera de la puerta esto no aplica: se afirma explicitamente en vez de
      // devolver un verde mudo, para que el informe distinga los dos casos.
      expect(ES_PUERTA).toBe(false);
      return;
    }
    expect(
      process.env.NELVYON_B3_DSN,
      "NELVYON_B3_PUERTA=1 sin NELVYON_B3_DSN: la puerta se saltaria las suites " +
        "de certificacion del Bloque 3 y reportaria verde. Eso no es una puerta.",
    ).toBeTruthy();
  });
});
