/**
 * LO QUE NO SE SABE NO SE PUBLICA SOLO.
 *
 * ── EL AGUJERO, LEIDO LINEA A LINEA ─────────────────────────────────────────
 *
 * `canPublishToPortal` era:
 *
 *     if (metadata?.shield_status === "blocked")  → denegar
 *     if (!regulated)                             → permitir
 *     if (metadata?.shield_status && status !== "passed" && status !== "warning")
 *                                                 → denegar
 *     return { allowed: true }
 *
 * La tercera condicion empieza por `metadata?.shield_status &&`. Cuando el
 * escudo no ha dejado señal —`undefined`— la condicion es falsa, no entra, y
 * cae hasta el `allowed: true` del final.
 *
 * Un entregable de sector regulado SIN NINGUNA señal de escudo se publicaba.
 *
 * Y no era el caso raro: es el que mas se da. Un entregable que nunca paso por
 * el escudo, uno cuyo metadata se perdio, uno creado por una ruta que aun no lo
 * escribe. El fallo abierto estaba justo donde falta la señal.
 *
 * ── EL SEGUNDO AGUJERO ──────────────────────────────────────────────────────
 *
 * `hasRequiredDisclaimer` devolvia `true` cuando no encontraba frases para el
 * sector, con el comentario «no specific disclaimer required for this sector».
 * Correcto para un sector NO regulado; lo contrario para uno regulado, que esta
 * en la lista PRECISAMENTE porque necesita aviso. Un sector regulado sin aviso
 * definido salia `passed`.
 *
 * ── POR QUE EL ESTADO ES `blocked` Y NO UNO NUEVO ───────────────────────────
 *
 * La tabla lo tiene cerrado:
 *
 *     CHECK (status IN ('pending','passed','blocked','warning'))
 *
 * Un valor nuevo exigiria migrar produccion, y hasta aplicarla cada auditoria
 * fallaria al escribirse. `blocked` es el estado canonico que YA significa «no
 * se publica» y que YA respetan todos los consumidores. El MOTIVO —que es lo
 * que se perderia— viaja en `checks` y en `metadata.revision_humana`, que son
 * JSONB sin restriccion.
 *
 * COSTE EXTERNO: 0 EUR. Puertos dobles, sin base ni red.
 */
import { describe, expect, it } from "vitest";

import {
  computeShieldStatus,
  hasRequiredDisclaimer,
  hayAvisoDefinidoPara,
  OsRegulatedSectorShieldService,
} from "../OsRegulatedSectorShieldService";
import { tratarComoRegulado } from "../../cumplimiento/regulacionDeSector";

/** Una base que no guarda nada: aqui se mide la decision, no la escritura. */
const dbMuda = {
  query: async () => ({ rows: [] }),
} as unknown as ConstructorParameters<typeof OsRegulatedSectorShieldService>[0];

const qaLimpio = {
  async runVisualLegal() {
    return { legal_passed: true, prohibited_terms: [] as string[] };
  },
};

function servicio(isRegulated: (s: string) => Promise<boolean>) {
  return new OsRegulatedSectorShieldService(dbMuda, { isRegulated }, qaLimpio);
}

/** El puerto real, derivado de la fuente canonica y sin dobles. */
const canonico = servicio(async (s) => tratarComoRegulado(s));

/** Un puerto que revienta: el caso ERROR. */
const roto = servicio(async () => {
  throw new Error("registro caido");
});

describe("MISSING != SAFE — el hueco por el que se publicaba", () => {
  it("LA REGLA: sector regulado SIN señal de escudo NO se publica", async () => {
    const r = await canonico.canPublishToPortal("dental", {});
    expect(r.allowed, "un entregable de sector regulado sin escudo se publicaba").toBe(false);
    expect(r.reason).toContain("REVISION HUMANA");
    /**
     * Y el motivo tiene que decir QUE falta la señal, no solo que no se
     * publica.
     *
     * Sin esta linea la prueba no distinguia «no hay señal» de «la señal no es
     * una aprobacion»: las dos ramas deniegan y las dos empiezan por «REVISION
     * HUMANA». Se comprobo con una mutacion —quitar la rama de la señal
     * ausente— y la prueba seguia en verde. Una defensa que nadie mide no esta
     * medida.
     */
    expect(r.reason, "el motivo no distingue una señal ausente de una señal mala").toContain(
      "sin ninguna señal",
    );
  });

  it("tampoco con la clave ausente, vacia o nula", async () => {
    const formas = [{}, { shield_status: undefined }, { shield_status: null }, { shield_status: "" }];
    for (const meta of formas) {
      const r = await canonico.canPublishToPortal("pharmacy", meta as Record<string, unknown>);
      expect(r.allowed, JSON.stringify(meta)).toBe(false);
    }
  });

  it("`pending` tampoco pasa: es no tener veredicto, no tenerlo bueno", async () => {
    const r = await canonico.canPublishToPortal("legal", { shield_status: "pending" });
    expect(r.allowed).toBe(false);
  });

  it("EL CONTROL: con el escudo aprobado SI se publica", async () => {
    // Sin esto, un `allowed: false` fijo pasaria todo lo de arriba y dejaria el
    // portal sin poder publicar nada.
    expect((await canonico.canPublishToPortal("dental", { shield_status: "passed" })).allowed).toBe(true);
    expect((await canonico.canPublishToPortal("dental", { shield_status: "warning" })).allowed).toBe(true);
  });

  it("EL OTRO CONTROL: un sector NO regulado se publica sin señal ninguna", async () => {
    // Es lo que distingue «cerrar el hueco» de «cerrar el portal».
    expect((await canonico.canPublishToPortal("restaurant", {})).allowed).toBe(true);
  });
});

describe("UNKNOWN != SAFE — un sector que nadie reconoce", () => {
  it("no se publica sin señal", async () => {
    expect((await canonico.canPublishToPortal("suplementos", {})).allowed).toBe(false);
  });

  it("y en el escudo acaba en revision humana, no en aprobado", async () => {
    const r = await canonico.evaluateShield({
      sectorId: "suplementos",
      htmlOrText: "Texto cualquiera sin nada prohibido.",
    });
    expect(r.status, "un sector desconocido salia aprobado").toBe("blocked");
    expect(r.metadata.revision_humana).toBeTruthy();
    expect(r.checks.find((c) => c.name === "revision_humana")?.ok).toBe(false);
  });
});

describe("ERROR != SAFE — no se pudo consultar el sector", () => {
  it("se supone regulado y acaba en revision humana", async () => {
    const r = await roto.evaluateShield({
      sectorId: "dental",
      htmlOrText: "Información orientativa, no sustituye el criterio de un profesional sanitario.",
    });
    expect(r.regulated).toBe(true);
    expect(r.status).toBe("blocked");
    expect(String(r.metadata.revision_humana)).toContain("no se pudo");
  });

  it("y tampoco se publica", async () => {
    expect((await roto.canPublishToPortal("dental", {})).allowed).toBe(false);
  });
});

describe("un sector regulado sin aviso definido no se aprueba solo", () => {
  it("hayAvisoDefinidoPara distingue las dos cosas", () => {
    expect(hayAvisoDefinidoPara("dental")).toBe(true);
    expect(hayAvisoDefinidoPara("salud")).toBe(true);
    expect(hayAvisoDefinidoPara("sector_inventado")).toBe(false);
  });

  it("hasRequiredDisclaimer ya no aprueba lo que no puede comprobar", () => {
    // Antes devolvia `true` con «no specific disclaimer required».
    expect(hasRequiredDisclaimer("cualquier texto", "sector_inventado")).toBe(false);
  });

  it("EL CONTROL: cuando el aviso SI esta definido y SI aparece, aprueba", () => {
    expect(hasRequiredDisclaimer("Esto no sustituye el criterio de un profesional sanitario.", "dental")).toBe(true);
  });

  it("y el prototipo de Object no cuela un sector", () => {
    for (const veneno of ["constructor", "toString", "valueOf", "__proto__"]) {
      expect(hayAvisoDefinidoPara(veneno), veneno).toBe(false);
      expect(hasRequiredDisclaimer("texto", veneno), veneno).toBe(false);
    }
  });
});

describe("el camino feliz sigue funcionando", () => {
  it("dental con su aviso y sin claims prohibidos → passed", async () => {
    const r = await canonico.evaluateShield({
      sectorId: "dental",
      htmlOrText: "Información orientativa: no sustituye el criterio de un profesional sanitario colegiado.",
    });
    expect(r.status).toBe("passed");
    expect(r.metadata.revision_humana).toBeUndefined();
  });

  it("computeShieldStatus no ha cambiado para lo que ya cubria", () => {
    // Anti-regresion sobre la funcion pura: lo nuevo se añadio ENCIMA, no en
    // lugar de.
    expect(computeShieldStatus({ regulated: true, disclaimerOk: false, claimsOk: true })).toBe("blocked");
    expect(computeShieldStatus({ regulated: true, disclaimerOk: true, claimsOk: true })).toBe("passed");
    expect(computeShieldStatus({ regulated: false, disclaimerOk: true, claimsOk: false })).toBe("warning");
    expect(computeShieldStatus({ regulated: false, disclaimerOk: true, claimsOk: true })).toBe("passed");
  });
});
