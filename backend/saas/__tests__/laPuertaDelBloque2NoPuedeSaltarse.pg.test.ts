/**
 * BLOQUE 2 · el trinquete de la propia puerta.
 *
 * Las 16 suites de certificación del Bloque 2 están condicionadas a
 * `NELVYON_B2_DSN`: sin base, se saltan. Eso es correcto para el día a día —no
 * todo el mundo levanta PostgreSQL para tocar un botón— pero abre un agujero
 * exacto en el momento que importa:
 *
 *   una PUERTA ejecutada sin el DSN se salta las 242 pruebas, no falla ninguna,
 *   y reporta VERDE.
 *
 * Sería el peor de los falsos verdes posibles: no dice "no certificado", dice
 * "certificado", y la evidencia entera del bloque desaparece sin dejar rastro en
 * el resumen.
 *
 * Este fichero cierra el agujero por el otro lado. Cuando alguien declara que
 * está corriendo la puerta —`NELVYON_B2_PUERTA=1`— exige que la infraestructura
 * esté de verdad. Si no lo está, FALLA en vez de saltarse.
 *
 * No se puede satisfacer bajando la guardia: apagar la variable no da verde,
 * da una puerta que ya no es puerta, y eso se ve en el comando.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const AQUI = __dirname;
const ES_PUERTA = process.env.NELVYON_B2_PUERTA === "1";

/** Las suites de certificación del bloque: `flujo*.pg.test.ts`. */
function suitesDeCertificacion(): string[] {
  return readdirSync(AQUI).filter((f) => /^flujo.*\.pg\.test\.ts$/.test(f));
}

describe("BLOQUE 2 · la puerta no puede saltarse a sí misma", () => {
  it("EL CONTROL: el barrido encuentra las suites de certificación", () => {
    // Sin esto, un cambio de nombre o de carpeta daría cero suites y las dos
    // comprobaciones de abajo pasarían sobre una lista vacía.
    expect(suitesDeCertificacion().length).toBeGreaterThanOrEqual(16);
  });

  it("toda suite de certificación está condicionada al MISMO DSN", () => {
    // Si una suite se condicionara a otra variable, correría o se saltaría por
    // su cuenta y el recuento del bloque dejaría de ser un número comparable.
    const desviadas: string[] = [];
    for (const f of suitesDeCertificacion()) {
      const texto = readFileSync(join(AQUI, f), "utf8");
      if (!texto.includes("NELVYON_B2_DSN")) desviadas.push(f);
    }
    expect(desviadas).toEqual([]);
  });

  it("declarada la PUERTA, la base tiene que existir de verdad", () => {
    if (!ES_PUERTA) {
      // Fuera de la puerta esto no aplica: se afirma explícitamente en vez de
      // devolver un verde mudo, para que el informe distinga los dos casos.
      expect(ES_PUERTA).toBe(false);
      return;
    }
    expect(
      process.env.NELVYON_B2_DSN,
      "NELVYON_B2_PUERTA=1 sin NELVYON_B2_DSN: la puerta se saltaria las 242 " +
        "pruebas de certificacion y reportaria verde. Eso no es una puerta.",
    ).toBeTruthy();
  });
});
