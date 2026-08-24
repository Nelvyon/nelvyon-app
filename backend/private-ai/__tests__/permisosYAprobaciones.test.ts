/**
 * BLOQUE 3 · lo prohibido no se puede aprobar.
 *
 * El defecto que estas pruebas fijan: `checkAction` consultaba la aprobacion
 * ANTES que la lista de acciones prohibidas, y `requiresApproval` devuelve
 * `true` para cualquier accion sensible. Resultado: una accion prohibida no se
 * bloqueaba, se degradaba a «pendiente de aprobacion».
 *
 * Eso no es un matiz de orden. Significa que bastaba con que una persona
 * pulsara aprobar para que un agente hiciera justo lo que su definicion dice
 * que no puede hacer. `forbiddenActions` estaba muerto para 8 de los 9 tipos de
 * accion; solo `cross_tenant_access` sobrevivia, por un caso especial escrito a
 * mano encima.
 */
import { describe, expect, it } from "vitest";

import { AgentPermissionService } from "../agents/AgentPermissionService";
import { getPrivateAgent, listPrivateAgents } from "../nelvyonAgentRegistry";
import { GLOBAL_SENSITIVE_ACTIONS } from "../sensitiveActions";
import type { AgentToolId, NelvyonPrivateAgentDef, SensitiveActionType } from "../types";

const svc = new AgentPermissionService();

function agenteFalso(over: Partial<NelvyonPrivateAgentDef> = {}): NelvyonPrivateAgentDef {
  const base = getPrivateAgent("seo")!;
  return { ...base, ...over };
}

describe("BLOQUE 3 · permisos de agente", () => {
  it("EL CONTROL: hay agentes registrados y acciones sensibles declaradas", () => {
    // Sin esto, un registro vacio haria pasar todo lo de abajo sobre la nada.
    expect(listPrivateAgents().length).toBeGreaterThanOrEqual(20);
    expect(GLOBAL_SENSITIVE_ACTIONS.length).toBeGreaterThanOrEqual(9);
  });

  // ── lo prohibido gana ─────────────────────────────────────────────────────

  it.each(GLOBAL_SENSITIVE_ACTIONS)(
    "una accion PROHIBIDA (%s) se bloquea, no se manda a aprobacion",
    (accion) => {
      // El corazon del defecto. Antes, todas menos `cross_tenant_access`
      // devolvian `needsApproval: true` y quedaban a un clic de ejecutarse.
      const agente = agenteFalso({
        forbiddenActions: [accion as SensitiveActionType],
        approvalRequiredActions: [...GLOBAL_SENSITIVE_ACTIONS],
      });
      const r = svc.checkAction(agente, accion);
      expect(r.blocked, accion).toBe(true);
      expect(r.needsApproval, accion).toBe(false);
      expect(r.reason).toMatch(/prohibida/i);
    },
  );

  it("EL CONTROL POSITIVO: lo que NO esta prohibido si pasa por aprobacion", () => {
    // Sin esto, una implementacion que bloqueara TODO pasaria la prueba de
    // arriba y dejaria el producto sin flujo de aprobacion: no seria mas
    // seguro, seria inutil.
    const agente = agenteFalso({
      forbiddenActions: [],
      approvalRequiredActions: [...GLOBAL_SENSITIVE_ACTIONS],
    });
    const r = svc.checkAction(agente, "send_mass_campaign");
    expect(r.blocked).toBe(false);
    expect(r.needsApproval).toBe(true);
  });

  it("una accion no sensible ni se bloquea ni pide aprobacion", () => {
    const r = svc.checkAction(agenteFalso({ forbiddenActions: [] }), "advise");
    expect(r.blocked).toBe(false);
    expect(r.needsApproval).toBe(false);
  });

  it("por defecto, un agente que no declara prohibidas conserva la aprobacion", () => {
    // El defecto era `?? ALL_SENSITIVE` en las dos listas: cada agente decia a
    // la vez «nunca» y «con permiso». Con el orden ya corregido, dejarlo asi
    // habria bloqueado todo y matado el flujo.
    for (const a of listPrivateAgents()) {
      if (a.forbiddenActions.length) continue;      // los que SI declaran, aparte
      const r = svc.checkAction(a, "send_mass_campaign");
      expect(r.blocked, a.id).toBe(false);
      expect(r.needsApproval, a.id).toBe(true);
    }
  });

  it("los agentes que declaran prohibidas las tienen de VERDAD", () => {
    // La prueba de que el campo dejo de ser decorativo.
    const conProhibidas = listPrivateAgents().filter((a) => a.forbiddenActions.length);
    expect(conProhibidas.length).toBeGreaterThan(0);   // control positivo
    for (const a of conProhibidas) {
      for (const accion of a.forbiddenActions) {
        const r = svc.checkAction(a, accion);
        expect(r.blocked, `${a.id}/${accion}`).toBe(true);
      }
    }
  });

  // ── herramientas ──────────────────────────────────────────────────────────

  it("una herramienta no concedida se deniega", () => {
    const agente = agenteFalso({ allowedTools: ["rag.search"] as AgentToolId[] });
    expect(svc.checkTool(agente, "billing.write" as AgentToolId).allowed).toBe(false);
  });

  it("EL CONTROL: una herramienta concedida SI se permite", () => {
    const agente = agenteFalso({ allowedTools: ["rag.search"] as AgentToolId[] });
    expect(svc.checkTool(agente, "rag.search" as AgentToolId).allowed).toBe(true);
  });

  it("un override de inquilino puede DENEGAR una herramienta concedida", () => {
    const agente = agenteFalso({ allowedTools: ["crm.write"] as AgentToolId[] });
    const r = svc.checkTool(agente, "crm.write" as AgentToolId, {
      agentId: agente.id, enabled: true, extraAllowedTools: [], deniedTools: ["crm.write"] as AgentToolId[],
    });
    expect(r.allowed).toBe(false);
  });

  it("un agente deshabilitado para el inquilino no usa NINGUNA herramienta", () => {
    const agente = agenteFalso({ allowedTools: ["rag.search"] as AgentToolId[] });
    const r = svc.checkTool(agente, "rag.search" as AgentToolId, {
      agentId: agente.id, enabled: false, extraAllowedTools: [], deniedTools: [],
    });
    expect(r.allowed).toBe(false);
  });

  it("la denegacion del inquilino gana sobre su propio permiso extra", () => {
    // Si `extraAllowedTools` pudiera resucitar una herramienta denegada, la
    // lista de denegadas no serviria de nada.
    const agente = agenteFalso({ allowedTools: [] as AgentToolId[] });
    const r = svc.checkTool(agente, "billing.write" as AgentToolId, {
      agentId: agente.id,
      enabled: true,
      extraAllowedTools: ["billing.write"] as AgentToolId[],
      deniedTools: ["billing.write"] as AgentToolId[],
    });
    expect(r.allowed).toBe(false);
  });
});
