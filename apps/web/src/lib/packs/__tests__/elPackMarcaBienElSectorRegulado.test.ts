/**
 * EL ESLABON DEL PACK: DE LA FICHA DEL CLIENTE A LA COMPROBACION CRITICA.
 *
 * `buildBaseBrief` produce `compliance_flags`, y de ahi sale la comprobacion
 * L-CNT-03 del `scorer`, marcada CRITICA:
 *
 *     check("L-CNT-03",
 *       !brief.compliance_flags?.regulated_sector || Boolean(copy?.regulated_disclaimer),
 *       5, true)
 *
 * Es decir: si la bandera no esta puesta, la comprobacion pasa SIEMPRE, lleve
 * aviso o no. Toda la exigencia de aviso legal en una landing depende de que
 * esa bandera este bien.
 *
 * Antes salia de dos nombres escritos a mano —`dental` y `fintech_b2b`—, asi
 * que una landing de farmacia, de despacho juridico o de una clinica aprobaba
 * el control de calidad sin aviso ninguno.
 *
 * ── LAS DOS BANDERAS NO SON LA MISMA, Y SE COMPRUEBAN DISTINTO ──────────────
 *
 *   `regulated_sector`      SABEMOS que esta regulado → exige aviso concreto
 *   `requires_legal_review` NO SABEMOS que sea seguro → lo mira una persona
 *
 * Ponerlas iguales seria el error que se quiso evitar: marcar `regulated_sector`
 * ante lo desconocido haria fallar L-CNT-03 en todo pack de sector no
 * catalogado, exigiendo un aviso que nadie ha definido. Eso no es cautela.
 *
 * COSTE EXTERNO: 0 EUR. Solo construye el brief; no ejecuta ningun pack.
 */
import { describe, expect, it } from "vitest";

import { buildBaseBrief } from "@/lib/packs/packOrchestrator";
import type { GrowthPackIntakeBase } from "@/lib/packs/types";

type Banderas = { regulated_sector?: boolean; requires_legal_review?: boolean };

function banderasDe(sector: string): Banderas {
  const intake = {
    business_name: "Cliente de prueba",
    sector,
    city: "Madrid",
    value_proposition: "Algo util",
    primary_cta: "Pide cita",
  } as unknown as GrowthPackIntakeBase & { sector: string };
  return buildBaseBrief(intake).compliance_flags as Banderas;
}

/** Sectores de los que SABEMOS que estan regulados. */
const REGULADOS = [
  "dental",
  "legal",
  "beauty",
  "solar",
  "seguros",
  "contabilidad",
  "medical",
  "pharmacy",
  "finance",
  "salud",
  "clinica",
  "fintech_b2b",
] as const;

/** Sectores de los que SABEMOS que no lo estan. */
const NO_REGULADOS = ["restaurant", "fitness", "ecommerce", "turismo", "hosteleria"] as const;

/** Sectores que nadie reconoce. */
const DESCONOCIDOS = ["suplementos", "health", "criptoactivos", "", "   "] as const;

describe("regulated_sector: la bandera que activa L-CNT-03", () => {
  it("EL DENOMINADOR: hay casos de los tres tipos", () => {
    // Sin esto, listas vacias harian pasar los tres bloques sin comprobar nada.
    expect(REGULADOS.length).toBeGreaterThanOrEqual(12);
    expect(NO_REGULADOS.length).toBeGreaterThanOrEqual(5);
    expect(DESCONOCIDOS.length).toBeGreaterThanOrEqual(4);
  });

  for (const sector of REGULADOS) {
    it(`${sector} → exige aviso legal`, () => {
      expect(
        banderasDe(sector).regulated_sector,
        `una landing de ${sector} pasaria L-CNT-03 sin aviso legal`,
      ).toBe(true);
    });
  }

  for (const sector of NO_REGULADOS) {
    it(`${sector} → NO exige aviso legal`, () => {
      // El control por el otro lado: marcarlo todo haria fallar el QA de todos
      // los packs y el producto no entregaria nada.
      expect(banderasDe(sector).regulated_sector).toBe(false);
    });
  }

  for (const sector of DESCONOCIDOS) {
    it(`«${sector}» (desconocido) → NO exige un aviso que nadie ha escrito`, () => {
      /**
       * A PROPOSITO, y es la parte contraintuitiva.
       *
       * Un sector desconocido NO pone `regulated_sector`. Ponerlo haria fallar
       * la comprobacion critica de todo pack de sector no catalogado, exigiendo
       * un `regulated_disclaimer` que no existe en ningun catalogo. El pack no
       * se entregaria, y no por proteger a nadie.
       *
       * La incertidumbre no se pierde: viaja en `requires_legal_review`, que es
       * la prueba de justo debajo.
       */
      expect(banderasDe(sector).regulated_sector).toBe(false);
    });
  }
});

describe("requires_legal_review: donde SI vive la incertidumbre", () => {
  for (const sector of [...REGULADOS, ...DESCONOCIDOS]) {
    it(`«${sector}» → lo mira una persona`, () => {
      expect(
        banderasDe(sector).requires_legal_review,
        `«${sector}» no esta demostrado seguro y nadie lo va a mirar`,
      ).toBe(true);
    });
  }

  for (const sector of NO_REGULADOS) {
    it(`${sector} → no necesita revision`, () => {
      // Sin esto, `requires_legal_review: true` fijo pasaria todo lo de arriba
      // y mandaria a revision humana el 100% de los entregables.
      expect(banderasDe(sector).requires_legal_review).toBe(false);
    });
  }
});

describe("las dos banderas modelan cosas distintas", () => {
  it("hay al menos un sector donde difieren, y es el desconocido", () => {
    /**
     * Si las dos banderas coincidieran siempre, una de las dos sobraria — y la
     * que sobrara acabaria borrada por simplificar, llevandose por delante la
     * distincion. Esta prueba fija que la diferencia existe y donde.
     */
    const b = banderasDe("suplementos");
    expect(b.regulated_sector).toBe(false);
    expect(b.requires_legal_review).toBe(true);
  });

  it("y hay otro donde coinciden, que es el regulado conocido", () => {
    const b = banderasDe("pharmacy");
    expect(b.regulated_sector).toBe(true);
    expect(b.requires_legal_review).toBe(true);
  });
});
