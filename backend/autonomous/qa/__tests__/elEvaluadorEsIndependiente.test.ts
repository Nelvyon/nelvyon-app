/**
 * BLOQUE 6 · quien evalua no es quien ejecuto.
 *
 * En un sistema autonomo, el evaluador es la unica pieza que puede decir «esto
 * no vale». Si el agente que produjo el trabajo influye en su propia nota, la
 * puerta de calidad deja de ser una puerta: cualquier cosa la cruza.
 *
 * Lo que se comprueba aqui es una propiedad **estructural**, no una opinion
 * sobre el codigo: la nota depende del ARTEFACTO y de nada mas. Dos ejecuciones
 * del mismo artefacto tienen que dar lo mismo aunque cambie quien lo firma, y
 * un artefacto peor no puede sacar mejor nota que uno mejor.
 *
 * Es la contrapartida del defecto que el Bloque 3 corrigio en
 * `AgentQualityService`, donde los marcadores de relleno se buscaban por
 * substring y un agente podia esquivarlos escribiendo distinto.
 */
import { describe, expect, it } from "vitest";

import { scoreLanding } from "../scorer";

const BRIEF = { objetivo: "captar leads", sector: "salud" };

function artefactoBueno(extra: Record<string, unknown> = {}) {
  return {
    plan: { blockers: [] },
    copy: {
      headline: "Consigue mas pacientes en tu clinica dental",
      subheadline: "Agenda online, recordatorios automaticos y seguimiento",
      cta: "Pide tu demo",
      sections: ["hero", "beneficios", "precios", "faq"],
    },
    build: { html: "<html><body><h1>ok</h1></body></html>", pages: 1, ok: true },
    _tier: "professional",
    ...extra,
  };
}

describe("BLOQUE 6 · la nota sale del artefacto, no de quien lo hizo", () => {
  it("EL CONTROL: un artefacto razonable saca una nota", () => {
    // Sin esto, un evaluador que devolviera siempre cero pasaria las pruebas de
    // abajo y bloquearia todo el producto.
    const r = scoreLanding(BRIEF, artefactoBueno(), 1);
    expect(r.score).toBeGreaterThan(0);
  });

  it("la misma entrada da la misma nota, siempre", () => {
    // Determinismo. Un evaluador que varie entre llamadas no se puede auditar:
    // ante una nota mala, nadie sabria si el trabajo era peor o si tuvo suerte.
    const a = scoreLanding(BRIEF, artefactoBueno(), 1);
    const b = scoreLanding(BRIEF, artefactoBueno(), 1);
    expect(a.score).toBe(b.score);
    expect(a.passed).toBe(b.passed);
  });

  it("quien firma el artefacto NO cambia la nota", () => {
    /**
     * La propiedad central. Se puntua el mismo artefacto atribuido a dos
     * agentes distintos —y a uno que dice ser el evaluador— y la nota tiene que
     * ser identica.
     *
     * Si cambiara, el evaluador estaria mirando la firma en vez del trabajo, y
     * un agente podria mejorar su nota simplemente diciendo que es otro.
     */
    const comoAgenteA = scoreLanding(BRIEF, artefactoBueno({ agentId: "agente-a" }), 1);
    const comoAgenteB = scoreLanding(BRIEF, artefactoBueno({ agentId: "agente-b" }), 1);
    const comoElEvaluador = scoreLanding(BRIEF, artefactoBueno({ agentId: "qa-scorer" }), 1);

    expect(comoAgenteA.score).toBe(comoAgenteB.score);
    expect(
      comoElEvaluador.score,
      "decir que el artefacto lo hizo el propio evaluador cambio la nota",
    ).toBe(comoAgenteA.score);
  });

  it("un artefacto declarado «aprobado» por su autor no aprueba solo", () => {
    /**
     * El caso que importa de verdad: el agente adjunta su propia conclusion.
     * Si el evaluador la respetara, bastaria con que un agente dijera que su
     * trabajo esta bien para que lo estuviera.
     */
    const vacio = {
      plan: { blockers: ["falta todo"] },
      copy: {},
      build: {},
      _tier: "professional",
      qaPassed: true,
      score: 100,
      selfAssessment: "excelente",
    };
    const r = scoreLanding(BRIEF, vacio, 1);
    expect(
      r.passed,
      "un artefacto vacio aprobo porque su autor dijo que estaba bien",
    ).toBe(false);
  });

  it("un artefacto peor no saca mas nota que uno mejor", () => {
    // Monotonia. Sin esto, el numero podria ser cualquier cosa mientras fuera
    // estable, y el determinismo por si solo no significa nada.
    const bueno = scoreLanding(BRIEF, artefactoBueno(), 1);
    const peor = scoreLanding(
      BRIEF,
      { plan: { blockers: ["sin copy"] }, copy: {}, build: {}, _tier: "professional" },
      1,
    );
    expect(peor.score).toBeLessThan(bueno.score);
  });
});
