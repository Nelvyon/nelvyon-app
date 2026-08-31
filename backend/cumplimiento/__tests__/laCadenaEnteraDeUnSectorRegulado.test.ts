/**
 * UN SECTOR REGULADO, SEGUIDO DE PUNTA A PUNTA.
 *
 * Ya hay fuente canonica y ya se cerro que UNKNOWN, ERROR y MISSING no son
 * seguros. Lo que esta prueba comprueba es otra cosa: que NADIE SE LA SALTA.
 *
 * Un solo eslabon con su propia lista escrita a mano deshace toda la cadena, y
 * el sintoma no seria un test rojo: seria un pack de farmacia publicado sin
 * aviso legal.
 *
 * ── LOS ESLABONES REALES, MEDIDOS ───────────────────────────────────────────
 *
 *   intake            `sector` es texto libre
 *   packOrchestrator  `buildBaseBrief` → compliance_flags
 *   scorer            L-CNT-03, CRITICA: exige `regulated_disclaimer` si la
 *                     bandera esta puesta
 *   sectorQa          SEC-REG-01, bloqueante, por `profile.regulated`
 *   shield            `evaluateShield` + `canPublishToPortal`
 *
 * Y CINCO listas de sectores distintas conviviendo:
 *
 *   1. `regulacionDeSector`                    la canonica
 *   2. `SECTOR_REGISTRY`                       20 sectores autonomos
 *   3. `SECTOR_CATALOG` (OsSectorReadiness)    los mismos 20, otra vez
 *   4. `REGULATED_SECTORS` (escudo)            ya deriva de la 1
 *   5. `packOrchestrator`                      ya deriva de la 1
 *
 * Las cinco coinciden hoy. Este fichero es lo que hace que sigan coincidiendo:
 * la 2 y la 3 se comparan sector a sector contra la 1, y cualquier divergencia
 * futura sale aqui en vez de en un entregable.
 *
 * COSTE EXTERNO: 0 EUR. Sin base, sin red, sin modelo.
 */
import { describe, expect, it } from "vitest";

import { regulacionDe, tratarComoRegulado } from "../regulacionDeSector";
import { SECTOR_REGISTRY } from "../../autonomous/sectors/sectorRegistry";
import { SECTOR_CATALOG } from "../../os-agents/sectors/OsSectorReadinessService";
import {
  hayAvisoDefinidoPara,
  OsRegulatedSectorShieldService,
  REGULATED_SECTORS,
} from "../../saas/OsRegulatedSectorShieldService";

/** Los trece casos que pide la directiva, mas los que hacen falta de control. */
const CASOS = [
  ["health", "no catalogado en ninguna fuente"],
  ["medical", "espacio libre del perfil SaaS"],
  ["pharmacy", "espacio libre del perfil SaaS"],
  ["finance", "espacio libre del perfil SaaS"],
  ["salud", "el mismo supuesto en castellano"],
  ["clinica", "el mismo supuesto en castellano"],
  ["dental", "esta en las cinco listas"],
  ["fintech_b2b", "solo lo marcaba packOrchestrator"],
  ["beauty", "regulado en el enum"],
  ["solar", "regulado en el enum"],
  ["seguros", "regulado en el enum"],
  ["contabilidad", "regulado en el enum"],
  ["restaurant", "el no regulado de control"],
] as const;

const dbMuda = {
  query: async () => ({ rows: [] }),
} as unknown as ConstructorParameters<typeof OsRegulatedSectorShieldService>[0];

const qaLimpio = {
  async runVisualLegal() {
    return { legal_passed: true, prohibited_terms: [] as string[] };
  },
};

/** El escudo con el puerto real derivado de la fuente canonica. */
const escudo = new OsRegulatedSectorShieldService(
  dbMuda,
  { async isRegulated(s: string) { return tratarComoRegulado(s); } },
  qaLimpio,
);

/** El escudo cuando la consulta del sector revienta: el caso ERROR. */
const escudoRoto = new OsRegulatedSectorShieldService(
  dbMuda,
  { async isRegulated() { throw new Error("registro caido"); } },
  qaLimpio,
);

// ═══════════════════════════════════════════════════════════════════════════
// Que nadie tenga su propia lista
// ═══════════════════════════════════════════════════════════════════════════

describe("las cinco listas no se separan", () => {
  it("EL DENOMINADOR: las tres listas de sectores estan llenas", () => {
    // Sin esto, una lista vacia haria pasar todas las comparaciones de abajo
    // sin comparar nada.
    expect(Object.keys(SECTOR_REGISTRY).length).toBe(20);
    expect(SECTOR_CATALOG.length).toBe(20);
    expect(REGULATED_SECTORS.size).toBeGreaterThanOrEqual(11);
  });

  it("SECTOR_REGISTRY dice lo mismo que la fuente canonica, sector a sector", () => {
    const discrepan: string[] = [];
    for (const [id, perfil] of Object.entries(SECTOR_REGISTRY)) {
      const enElRegistro = !!(perfil as { regulated?: boolean }).regulated;
      const enLaCanonica = regulacionDe(id) === "REGULADO";
      if (enElRegistro !== enLaCanonica) {
        discrepan.push(`${id}: registro=${enElRegistro} canonica=${enLaCanonica}`);
      }
    }
    expect(discrepan, discrepan.join(" | ")).toEqual([]);
  });

  it("SECTOR_CATALOG dice lo mismo que la fuente canonica, sector a sector", () => {
    /**
     * `SECTOR_CATALOG` es una QUINTA lista, en
     * `OsSectorReadinessService`. Tiene los mismos 20 sectores con la misma
     * bandera, y decide si un sector necesita rubrica de QA de cumplimiento
     * (`hasQaRubric`) — es decir, tiene consecuencias.
     *
     * No se fusiona con las otras porque lleva ademas `label` y `sensitivity`
     * que son suyos, y reescribir un modulo que usan otros sitios tiene mas
     * riesgo que valor. Lo que no puede pasar es que se separen sin que nadie
     * se entere, y de eso se encarga esto.
     */
    const discrepan: string[] = [];
    for (const entrada of SECTOR_CATALOG) {
      const enElCatalogo = entrada.regulated;
      const enLaCanonica = regulacionDe(entrada.id) === "REGULADO";
      if (enElCatalogo !== enLaCanonica) {
        discrepan.push(`${entrada.id}: catalogo=${enElCatalogo} canonica=${enLaCanonica}`);
      }
    }
    expect(discrepan, discrepan.join(" | ")).toEqual([]);
  });

  it("y los dos catalogos tienen exactamente los mismos identificadores", () => {
    // Una lista con un sector que la otra no tiene es el paso previo a que las
    // banderas se separen.
    expect(SECTOR_CATALOG.map((e) => e.id).sort()).toEqual(Object.keys(SECTOR_REGISTRY).sort());
  });

  it("REGULATED_SECTORS del escudo YA no es una lista propia", () => {
    // Deriva del modulo canonico; si alguien volviera a escribirla a mano, esto
    // no lo detectaria por identidad, asi que se comprueba por contenido.
    for (const s of REGULATED_SECTORS) {
      expect(regulacionDe(s), `${s} esta en el escudo y no en la canonica`).toBe("REGULADO");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// La cadena, caso a caso
// ═══════════════════════════════════════════════════════════════════════════

describe("la cadena entera, sector a sector", () => {
  for (const [sector, nota] of CASOS) {
    const deberiaSerRegulado = sector !== "restaurant";

    it(`${sector} (${nota}): el escudo NO lo aprueba solo sin aviso`, async () => {
      const r = await escudo.evaluateShield({
        sectorId: sector,
        htmlOrText: "Somos los mejores de la ciudad. Llamanos hoy.",
      });

      if (!deberiaSerRegulado) {
        expect(r.regulated).toBe(false);
        expect(r.status, "un sector no regulado deja de publicarse").toBe("passed");
        return;
      }

      expect(r.regulated, `${sector} salio como no regulado`).toBe(true);
      expect(
        r.status,
        `${sector} aprobo el escudo con un texto sin ningun aviso legal`,
      ).toBe("blocked");
    });

    it(`${sector}: sin señal de escudo, NO se publica en el portal`, async () => {
      const r = await escudo.canPublishToPortal(sector, {});
      if (!deberiaSerRegulado) {
        expect(r.allowed).toBe(true);
        return;
      }
      expect(r.allowed, `${sector} se publica sin haber pasado por el escudo`).toBe(false);
      expect(r.reason).toContain("REVISION HUMANA");
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Los cinco estados
// ═══════════════════════════════════════════════════════════════════════════

describe("los cinco estados acaban donde deben", () => {
  it("REGULADO con su aviso puesto → passed", async () => {
    // EL CONTROL POSITIVO DE TODO EL FICHERO. Sin el, un escudo que bloqueara
    // siempre pasaria cada una de las pruebas de arriba y dejaria el producto
    // sin poder entregar nada.
    const r = await escudo.evaluateShield({
      sectorId: "dental",
      htmlOrText:
        "Informacion orientativa: no sustituye el criterio de un profesional sanitario colegiado.",
    });
    expect(r.status).toBe("passed");
  });

  it("NO_REGULADO → passed y publica", async () => {
    const r = await escudo.evaluateShield({ sectorId: "restaurant", htmlOrText: "Ven a cenar." });
    expect(r.status).toBe("passed");
    expect((await escudo.canPublishToPortal("restaurant", {})).allowed).toBe(true);
  });

  it("DESCONOCIDO → revision humana, nunca aprobado", async () => {
    for (const raro of ["suplementos", "health", "sector_de_2030", "criptoactivos"]) {
      const r = await escudo.evaluateShield({ sectorId: raro, htmlOrText: "Texto neutro." });
      expect(r.status, `${raro} salio aprobado`).toBe("blocked");
      expect(r.metadata.revision_humana, `${raro} sin motivo de revision`).toBeTruthy();
    }
  });

  it("ERROR de lookup → se supone regulado y va a revision", async () => {
    const r = await escudoRoto.evaluateShield({
      sectorId: "restaurant",
      htmlOrText: "Ven a cenar.",
    });
    expect(r.regulated, "un fallo al consultar el sector se resolvio como «no regulado»").toBe(true);
    expect(r.status).toBe("blocked");
    expect(String(r.metadata.revision_humana)).toContain("no se pudo");
  });

  it("MISSING (sin sector) → no se publica", async () => {
    for (const vacio of [undefined, null, ""]) {
      const r = await escudo.canPublishToPortal(vacio as unknown as string, {});
      expect(r.allowed, `un sector «${String(vacio)}» permitio publicar`).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Nadie inventa avisos
// ═══════════════════════════════════════════════════════════════════════════

describe("no se inventa ningun aviso legal", () => {
  it("un sector regulado sin aviso definido NO recibe uno improvisado", async () => {
    /**
     * Es la otra forma de fallar: en vez de aprobar sin aviso, aprobar CON un
     * aviso que nadie ha redactado ni revisado. Publicar un texto legal
     * inventado es peor que no publicar ninguno.
     *
     * `fintech_b2b` es el caso real: esta en la lista de regulados —venia de
     * `packOrchestrator`— y no tiene texto definido.
     */
    expect(hayAvisoDefinidoPara("fintech_b2b")).toBe(false);
    const r = await escudo.evaluateShield({
      sectorId: "fintech_b2b",
      htmlOrText: "Pagos B2B sin friccion.",
    });
    expect(r.status).toBe("blocked");
    expect(r.disclaimerText, "se le adjudico un aviso que nadie escribio").toBeFalsy();
  });

  it("y el que SI esta definido se usa tal cual", () => {
    // Control: que no se invente no puede significar que no haya ninguno.
    expect(hayAvisoDefinidoPara("dental")).toBe(true);
    expect(hayAvisoDefinidoPara("salud")).toBe(true);
    expect(hayAvisoDefinidoPara("finance")).toBe(true);
  });
});
