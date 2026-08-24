/**
 * BLOQUE 3 · las Skills existen, estan repartidas y nadie se autorrevisa.
 *
 * Tres cosas que hay que vigilar y que no se vigilan solas:
 *
 *   1. Que cada Skill declarada tenga un fichero de verdad detras. Una lista de
 *      nombres sin ficheros es un folleto.
 *   2. Que el reparto sea de minimo privilegio de verdad, no «todas para todos»
 *      con una lista larga que lo disimula.
 *   3. Que quien produce un entregable NO lleve la Skill de revisarlo. Un agente
 *      que revisa su propio trabajo no revisa, relee — y ese es justo el fallo
 *      que el bloque persigue: el QA que siempre aprueba.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { listPrivateAgents } from "../nelvyonAgentRegistry";
import {
  AGENTES_QUE_PRODUCEN,
  SKILLS_DE_NELVYON,
  SKILLS_DE_REVISION,
  SKILLS_POR_AGENTE,
  agentePuedeUsar,
  skillsDe,
} from "../skills/registroDeSkills";

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

const CARPETA = join(raizDelProyecto(), ".claude", "skills");

describe("BLOQUE 3 · registro de Skills de NELVYON", () => {
  it("EL CONTROL: hay Skills declaradas y carpeta con ficheros", () => {
    // Sin esto, una lista vacia y una carpeta vacia harian pasar todo lo de
    // abajo sobre la nada.
    expect(SKILLS_DE_NELVYON.length).toBeGreaterThanOrEqual(16);
    expect(readdirSync(CARPETA).length).toBeGreaterThanOrEqual(16);
  });

  it.each(SKILLS_DE_NELVYON)("`%s` tiene su SKILL.md con contenido real", (skill) => {
    const f = join(CARPETA, skill, "SKILL.md");
    expect(existsSync(f), `falta ${skill}/SKILL.md`).toBe(true);

    const texto = readFileSync(f, "utf8");
    expect(texto.startsWith("---"), `${skill}: sin frontmatter`).toBe(true);
    expect(texto).toContain(`name: ${skill}`);
    expect(texto).toMatch(/description: \S/);
    // Un estandar de calidad no cabe en cuatro lineas. Este umbral no mide
    // calidad, pero si descarta el marcador de posicion.
    expect(texto.length, `${skill}: demasiado corto para ser un estandar`).toBeGreaterThan(1200);
  });

  it("toda Skill del arbol esta declarada en el registro", () => {
    // La direccion que se olvida: alguien anade una carpeta y nadie la asigna.
    // Una Skill que no esta en el registro no la usa ningun agente, asi que es
    // trabajo escrito que no llega a nadie.
    const enDisco = readdirSync(CARPETA).filter((d) => existsSync(join(CARPETA, d, "SKILL.md")));
    const declaradas = new Set<string>(SKILLS_DE_NELVYON);
    expect(enDisco.filter((d) => !declaradas.has(d))).toEqual([]);
  });

  it("toda Skill asignada a un agente existe", () => {
    const validas = new Set<string>(SKILLS_DE_NELVYON);
    const invalidas: string[] = [];
    for (const [agente, lista] of Object.entries(SKILLS_POR_AGENTE)) {
      for (const s of lista) if (!validas.has(s)) invalidas.push(`${agente}:${s}`);
    }
    expect(invalidas).toEqual([]);
  });

  it("todo agente del reparto existe en el registro de agentes", () => {
    // Repartir Skills a un agente que no existe es una linea que nadie ejecuta
    // y que hace pensar que la cobertura es mayor de lo que es.
    const reales = new Set(listPrivateAgents().map((a) => a.id));
    const fantasmas = Object.keys(SKILLS_POR_AGENTE).filter((a) => !reales.has(a));
    expect(fantasmas).toEqual([]);
  });

  it("MINIMO PRIVILEGIO: ningun agente lleva todas las Skills", () => {
    // Si alguien «resolviera» el reparto dandoselas todas a todos, esta prueba
    // lo dice. Un reparto que no restringe no es un reparto.
    for (const [agente, lista] of Object.entries(SKILLS_POR_AGENTE)) {
      expect(lista.length, `${agente} lleva todas`).toBeLessThan(SKILLS_DE_NELVYON.length);
    }
  });

  it("MINIMO PRIVILEGIO: un agente de SEO no lleva la Skill de ventas ni la de pago", () => {
    expect(agentePuedeUsar("seo", "nelvyon-sales")).toBe(false);
    expect(agentePuedeUsar("seo", "nelvyon-paid-media")).toBe(false);
    expect(agentePuedeUsar("seo", "nelvyon-seo-elite")).toBe(true); // control positivo
  });

  it("MINIMO PRIVILEGIO: un redactor no lleva la Skill de analitica ni la de pago", () => {
    expect(agentePuedeUsar("content", "nelvyon-analytics")).toBe(false);
    expect(agentePuedeUsar("content", "nelvyon-paid-media")).toBe(false);
    expect(agentePuedeUsar("content", "nelvyon-brand-strategy")).toBe(true); // control positivo
  });

  it("NADIE SE AUTORREVISA: quien produce no lleva la Skill de revisar", () => {
    // El fallo que este bloque persigue con nombre propio: el QA que siempre
    // aprueba. La forma mas comun de conseguirlo es que revise el mismo que
    // escribio.
    for (const agente of AGENTES_QUE_PRODUCEN) {
      for (const revision of SKILLS_DE_REVISION) {
        expect(agentePuedeUsar(agente, revision), `${agente} se autorrevisa con ${revision}`)
          .toBe(false);
      }
    }
  });

  it("EL CONTROL: alguien SI lleva las Skills de revision", () => {
    // Sin este control, quitarselas a todo el mundo pasaria la prueba de arriba
    // y dejaria el sistema sin QA en absoluto.
    for (const revision of SKILLS_DE_REVISION) {
      const quienes = Object.keys(SKILLS_POR_AGENTE).filter((a) => agentePuedeUsar(a, revision));
      expect(quienes.length, `nadie puede usar ${revision}`).toBeGreaterThan(0);
    }
  });

  it("un agente desconocido no hereda ninguna Skill", () => {
    expect(skillsDe("agente-que-no-existe")).toEqual([]);
  });
});
