/**
 * BLOQUE 3 · el orquestador privado, de punta a punta.
 *
 * Es el camino completo de una petición dentro de la empresa IA de NELVYON:
 *
 *   petición → agente → permisos de herramienta → permisos de acción →
 *   ¿aprobación? → contexto (memoria/RAG como DATOS) → modelo → traza
 *
 * Lo que se comprueba en cada punto es lo mismo: **que no se salte, y que si se
 * detiene lo diga en vez de devolver algo que parezca un resultado**.
 */
import { describe, expect, it, vi } from "vitest";

import { PrivateAiOrchestrator } from "../orchestrator/PrivateAiOrchestrator";
import { listPrivateAgents } from "../nelvyonAgentRegistry";
import type { AgentToolId } from "../types";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaab03";

/** Base falsa: responde vacío a todo salvo lo que se le indique. */
function baseFalsa(filas: Record<string, unknown>[] = []) {
  const consultas: string[] = [];
  return {
    db: {
      query: async (sql: string) => {
        consultas.push(sql);
        return filas;
      },
    } as never,
    consultas,
  };
}

function auditoriaFalsa() {
  const registrado: Array<Record<string, unknown>> = [];
  return {
    svc: { log: async (e: Record<string, unknown>) => { registrado.push(e); return "audit-1"; } } as never,
    registrado,
  };
}

function aprobacionesFalsas() {
  const encoladas: Array<Record<string, unknown>> = [];
  return {
    svc: {
      queue: async (i: Record<string, unknown>) => { encoladas.push(i); return "aprob-1"; },
      list: async () => [],
    } as never,
    encoladas,
  };
}

const AJUSTES = { aiMode: "stub", privateAiOnly: true } as never;

describe("BLOQUE 3 · orquestador privado", () => {
  it("EL CONTROL: lista los agentes con sus permisos a la vista", () => {
    // Sin esto, un orquestador sin agentes pasaria las pruebas de abajo por
    // ausencia de sujeto.
    const { db } = baseFalsa();
    const orq = new PrivateAiOrchestrator(db);
    const agentes = orq.listAgents();
    expect(agentes.length).toBeGreaterThanOrEqual(20);
    // Los permisos viajan en el listado: quien lo consuma puede ver que puede
    // hacer cada agente sin tener que abrir el codigo.
    expect(agentes[0]).toHaveProperty("allowedTools");
    expect(agentes[0]).toHaveProperty("forbiddenActions");
    expect(agentes[0]).toHaveProperty("approvalRequiredActions");
  });

  it("un agente DESCONOCIDO no se inventa", async () => {
    const { db } = baseFalsa();
    const orq = new PrivateAiOrchestrator(db);
    await expect(
      orq.runAgent({ tenantId: TENANT, agentId: "agente-que-no-existe", input: "hola" }, AJUSTES),
    ).rejects.toThrow(/Unknown private AI agent/i);
  });

  it("una herramienta NO concedida detiene la ejecucion", async () => {
    // El agente de SEO no tiene permiso de facturacion. Si la peticion lo pide,
    // el orquestador tiene que negarse ANTES de llamar a nada.
    const { db } = baseFalsa();
    const orq = new PrivateAiOrchestrator(db);
    await expect(
      orq.runAgent(
        { tenantId: TENANT, agentId: "seo", input: "cambia la facturacion", toolId: "billing.write" as AgentToolId },
        AJUSTES,
      ),
    ).rejects.toThrow(/permiso|denied/i);
  });

  it("una accion PROHIBIDA se bloquea y no llega al modelo", async () => {
    // `development` prohibe tocar produccion y codigo destructivo. La prueba
    // vale porque el arreglo de AgentPermissionService hizo que `forbiddenActions`
    // dejara de ser decorativo.
    const conProhibidas = listPrivateAgents().find((a) => a.forbiddenActions.length > 0);
    expect(conProhibidas, "ningun agente declara prohibidas").toBeTruthy();

    const { db } = baseFalsa();
    const orq = new PrivateAiOrchestrator(db);
    await expect(
      orq.runAgent(
        { tenantId: TENANT, agentId: conProhibidas!.id, input: "hazlo", action: conProhibidas!.forbiddenActions[0] },
        AJUSTES,
      ),
    ).rejects.toThrow(/prohibida/i);
  });

  it("una accion sensible se ENCOLA y el resultado NO dice que se hizo", async () => {
    // El punto donde el contrato de estados se gana o se pierde: la respuesta
    // tiene que decir que quedo pendiente, no devolver un texto que se lea como
    // trabajo terminado.
    const { db } = baseFalsa();
    const audit = auditoriaFalsa();
    const aprob = aprobacionesFalsas();
    const orq = new PrivateAiOrchestrator(db, { audit: audit.svc, approvals: aprob.svc });

    const r = await orq.runAgent(
      { tenantId: TENANT, agentId: "marketing", input: "manda la campana", action: "send_mass_campaign" },
      AJUSTES,
    );

    expect(r.approvalRequired).toBe(true);
    expect(r.approvalId).toBe("aprob-1");
    expect(r.ready).toBe(false);
    expect(r.output).toMatch(/aprobaci/i);
    expect(r.output).not.toMatch(/\benviad[ao]\b|\bcompletad[ao]\b/i);
    expect(aprob.encoladas).toHaveLength(1);
  });

  it("lo encolado queda en la TRAZA, con su marca de encolado", async () => {
    // Una accion que se detiene tambien tiene que dejar rastro: si no, en la
    // auditoria parece que nadie la pidio nunca.
    const { db } = baseFalsa();
    const audit = auditoriaFalsa();
    const aprob = aprobacionesFalsas();
    const orq = new PrivateAiOrchestrator(db, { audit: audit.svc, approvals: aprob.svc });

    await orq.runAgent(
      { tenantId: TENANT, agentId: "marketing", input: "manda la campana", action: "send_mass_campaign" },
      AJUSTES,
    );

    expect(audit.registrado).toHaveLength(1);
    expect(audit.registrado[0]!.provider).toBe("approval_queue");
    expect((audit.registrado[0]!.metadata as { queued?: boolean }).queued).toBe(true);
  });

  it("la accion `advise` no pide aprobacion: aconsejar no cambia nada", async () => {
    // El control positivo del gate. Si TODO pidiera aprobacion, el sistema seria
    // seguro e inutil, y alguien acabaria quitando el gate entero.
    const { db } = baseFalsa();
    const audit = auditoriaFalsa();
    const aprob = aprobacionesFalsas();
    const orq = new PrivateAiOrchestrator(db, { audit: audit.svc, approvals: aprob.svc });

    const r = await orq.runAgent(
      { tenantId: TENANT, agentId: "seo", input: "que opinas de mi web", action: "advise" },
      AJUSTES,
    );
    expect(r.approvalRequired).toBeFalsy();
    expect(aprob.encoladas).toHaveLength(0);
  });

  it("toda ejecucion deja traza, tambien la que no pide aprobacion", async () => {
    const { db } = baseFalsa();
    const audit = auditoriaFalsa();
    const orq = new PrivateAiOrchestrator(db, { audit: audit.svc });

    await orq.runAgent({ tenantId: TENANT, agentId: "seo", input: "hola", action: "advise" }, AJUSTES);
    expect(audit.registrado).toHaveLength(1);
    expect(audit.registrado[0]!.tenantId).toBe(TENANT);
    expect(audit.registrado[0]!.agentId).toBe("seo");
  });

  it("el resultado dice si vino de un SUSTITUTO, no lo esconde", async () => {
    // Sin proveedor configurado, la respuesta la escribe un sustituto. Que el
    // resultado lo declare es lo que impide que un texto de relleno viaje como
    // trabajo real.
    const { db } = baseFalsa();
    const audit = auditoriaFalsa();
    const orq = new PrivateAiOrchestrator(db, { audit: audit.svc });

    const r = await orq.runAgent({ tenantId: TENANT, agentId: "seo", input: "hola" }, AJUSTES);
    expect(typeof r.mock).toBe("boolean");
    expect(typeof r.ready).toBe("boolean");
    // Y la traza guarda lo mismo, para que se pueda auditar despues.
    expect(audit.registrado[0]!.metadata).toHaveProperty("mock");
  });
});
