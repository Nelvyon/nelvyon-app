/**
 * Seis especialistas de red, no seis nombres sobre el mismo agente.
 *
 * ── QUE SE PROTEGE, Y POR QUE ES FACIL DE FINGIR ────────────────────────────
 *
 * «Departamento social con seis agentes» se falsifica en un minuto: se copian
 * seis definiciones y se cambia el nombre. El sistema pasaria a tener seis
 * entradas y exactamente el mismo comportamiento, que es lo que ya pasaba en
 * otra forma —un agente horizontal con DOS menciones a una plataforma concreta
 * en 129 lineas—.
 *
 * Por eso estas pruebas no CUENTAN especialistas: los COMPARAN. Que existan seis
 * no dice nada; que ninguno comparta objetivo, instrucciones ni prohibiciones
 * con otro es lo que hace que sean seis.
 *
 * ── Y QUE NINGUNO PUBLIQUE ──────────────────────────────────────────────────
 *
 * Un especialista redacta. Publicar en la cuenta de un cliente cruza la frontera
 * de publicacion, con su interruptor y su aprobacion. Si manana alguien le da
 * `campaigns.send` a uno de estos, esta prueba lo dice.
 *
 * COSTE EXTERNO: 0 EUR. Se leen definiciones.
 */
import { describe, expect, it } from "vitest";

import {
  ESPECIALISTAS_SOCIALES,
  IDS_DE_ESPECIALISTAS_SOCIALES,
  CABEZA_DEL_DEPARTAMENTO_SOCIAL,
} from "../especialistasSociales";
import { NELVYON_PRIVATE_AGENTS } from "../nelvyonAgentRegistry";
import { WORKFORCE_HIERARCHY } from "../../agents/workforce/hierarchy";
import { CONTRATO_POR_PLATAFORMA, PLATAFORMAS } from "../../agency/nativoPorPlataforma";

/** Herramientas que producen un efecto fuera de NELVYON. */
const HERRAMIENTAS_QUE_SALEN = ["campaigns.send", "inbox.send", "workflows.execute"];

describe("el departamento social tiene seis especialistas de verdad", () => {
  it("EL CONTROL: los seis estan registrados como agentes", () => {
    expect(ESPECIALISTAS_SOCIALES).toHaveLength(6);
    for (const id of IDS_DE_ESPECIALISTAS_SOCIALES) {
      expect(
        NELVYON_PRIVATE_AGENTS.find((a) => a.id === id),
        `${id} no esta en el registro de agentes`,
      ).toBeDefined();
    }
  });

  it("NINGUNO comparte objetivo con otro", () => {
    const objetivos = ESPECIALISTAS_SOCIALES.map((e) => e.objective);
    expect(new Set(objetivos).size, "hay objetivos repetidos entre especialistas").toBe(6);
  });

  it("NINGUNO comparte instrucciones con otro", () => {
    const prompts = ESPECIALISTAS_SOCIALES.map((e) => e.systemPrompt);
    expect(new Set(prompts).size, "hay instrucciones repetidas").toBe(6);
  });

  it("cada uno lleva las prohibiciones DE SU RED y no las del vecino", () => {
    // Es la prueba que de verdad separa seis especialistas de seis nombres: lo
    // que NO se hace es donde vive el copia-pega.
    for (const p of PLATAFORMAS) {
      const e = ESPECIALISTAS_SOCIALES.find((x) => x.id === `social_${p}`)!;
      for (const suya of CONTRATO_POR_PLATAFORMA[p].nunca) {
        expect(e.systemPrompt, `${p} no lleva su propia prohibicion`).toContain(suya);
      }
      for (const otra of PLATAFORMAS) {
        if (otra === p) continue;
        for (const ajena of CONTRATO_POR_PLATAFORMA[otra].nunca) {
          expect(
            e.systemPrompt,
            `el especialista de ${p} lleva una prohibicion de ${otra}`,
          ).not.toContain(ajena);
        }
      }
    }
  });

  it("NINGUNO puede publicar ni ejecutar por su cuenta", () => {
    for (const e of ESPECIALISTAS_SOCIALES) {
      for (const t of HERRAMIENTAS_QUE_SALEN) {
        expect(
          e.allowedTools as readonly string[],
          `${e.id} tiene una herramienta que sale al mundo: ${t}`,
        ).not.toContain(t);
      }
      expect(e.limits.canAutoExecute, `${e.id} se ejecuta solo`).toBe(false);
      expect(
        e.approvalRequiredActions,
        `${e.id} no exige aprobacion para hablar con la audiencia del cliente`,
      ).toContain("send_client_message");
    }
  });
});

describe("cuelgan de donde deben", () => {
  it("los seis son L3 bajo el head social, y el head bajo marketing", () => {
    const head = WORKFORCE_HIERARCHY.find((a) => a.agentId === CABEZA_DEL_DEPARTAMENTO_SOCIAL);
    expect(head, "no existe el head del departamento social").toBeDefined();
    expect(head!.reportsTo).toBe("marketing");

    for (const id of IDS_DE_ESPECIALISTAS_SOCIALES) {
      const perfil = WORKFORCE_HIERARCHY.find((a) => a.agentId === id);
      expect(perfil, `${id} no esta en la jerarquia`).toBeDefined();
      expect(perfil!.level).toBe("L3_specialist");
      expect(perfil!.reportsTo).toBe(CABEZA_DEL_DEPARTAMENTO_SOCIAL);
      expect(
        perfil!.operationModesAllowed,
        `${id} puede correr en autonomo; un especialista entrega borradores`,
      ).not.toContain("autonomous");
    }
  });

  it("registro y jerarquia NO pueden divergir", () => {
    // Una red nueva aparece en los dos sitios o en ninguno. Si alguien anade un
    // especialista al registro y se olvida de la jerarquia, queda sin jefe y sin
    // limites de modo — que es peor que no tenerlo.
    const enJerarquia = WORKFORCE_HIERARCHY.filter((a) => a.agentId.startsWith("social_"))
      .map((a) => a.agentId)
      .filter((id) => id !== CABEZA_DEL_DEPARTAMENTO_SOCIAL)
      .sort();
    expect(enJerarquia).toEqual([...IDS_DE_ESPECIALISTAS_SOCIALES].sort());
  });
});
