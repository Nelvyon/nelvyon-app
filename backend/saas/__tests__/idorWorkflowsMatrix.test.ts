import { beforeEach, describe, expect, it } from "vitest";

/**
 * Matriz IDOR EJECUTABLE para workflows.
 *
 * Mismo molde que deals y contactos: se ejecuta el servicio real contra un
 * Postgres falso que honra el filtro REALMENTE presente en la sentencia. No se
 * mockea el control que se certifica, solo el motor que lo aplicaría.
 *
 * Workflows es el recurso con más superficie de los seis: además de CRUD tiene
 * dos acciones de cambio de estado (`activateWorkflow`, `pauseWorkflow`) y dos
 * endpoints secundarios que reutilizan el mismo ID (`getCampaniaStats`,
 * `getRecipients`). Todos se prueban con el UUID de A desde el tenant B.
 */
import { SaasWorkflowService } from "../SaasWorkflowService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const WF_A = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function dbFalsa() {
  const fila: Record<string, unknown> = {
    id: WF_A,
    tenant_id: A,
    name: "Workflow interno de ACME",
    description: null,
    status: "draft",
    trigger_type: "manual",
    trigger_config: null,
    conditions: [],
    actions: [{ type: "email", config: { subject: "Oferta secreta de A" } }],
    run_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
  const borrada = { v: false };
  const sentencias: Array<{ sql: string; params: unknown[] }> = [];

  const port = {
    query: async (sql: string, params: unknown[] = []) => {
      sentencias.push({ sql, params });
      const filtra = /tenant_id\s*=\s*\$\d/i.test(sql);
      const tenant = params.find((p) => p === A || p === B);
      const id = params.find(
        (p) => typeof p === "string" && /^[0-9a-f-]{36}$/i.test(String(p)) && p !== A && p !== B,
      );
      // Sin filtro de tenant en el SQL la fila sale siempre: así el test
      // detecta la fuga en lugar de taparla.
      const visible =
        (!filtra || tenant === fila.tenant_id) && (id === undefined || id === fila.id) && !borrada.v;

      if (/^\s*DELETE/i.test(sql)) {
        if (visible) borrada.v = true;
        return [];
      }
      if (/^\s*UPDATE/i.test(sql)) {
        if (!visible) return [];
        const nuevo = params.find((p) => typeof p === "string" && String(p).startsWith("HACK"));
        if (nuevo) fila.name = nuevo;
        const estado = params.find((p) => p === "active" || p === "paused");
        if (estado) fila.status = estado;
        return [{ ...fila }];
      }
      return visible ? [{ ...fila }] : [];
    },
  } as unknown as SaasPostgresPort;

  return { port, sentencias, fila, borrada };
}

const svc = (db: ReturnType<typeof dbFalsa>) => new SaasWorkflowService(db.port);

describe("IDOR workflows — LIST", () => {
  it("A ve su workflow", async () => {
    const db = dbFalsa();
    expect(await svc(db).getWorkflows(A)).toHaveLength(1);
  });

  it("B NO ve la workflow de A ni su contenido", async () => {
    const db = dbFalsa();
    const r = await svc(db).getWorkflows(B);
    expect(r).toHaveLength(0);
    const s = JSON.stringify(r);
    expect(s).not.toContain("Oferta secreta de A");
    expect(s).not.toContain("cuerpo confidencial");
  });

  it("el listado filtra por tenant en el SQL", async () => {
    const db = dbFalsa();
    await svc(db).getWorkflows(B);
    expect(db.sentencias[0]!.sql).toMatch(/tenant_id\s*=\s*\$/i);
    expect(db.sentencias[0]!.params).toContain(B);
  });
});

describe("IDOR workflows — READ con el UUID exacto de A", () => {
  it("A la obtiene", async () => {
    const db = dbFalsa();
    expect(await svc(db).getWorkflow(A, WF_A)).not.toBeNull();
  });

  it("B con el UUID de A obtiene null, sin asunto ni cuerpo", async () => {
    const db = dbFalsa();
    const r = await svc(db).getWorkflow(B, WF_A);
    expect(r).toBeNull();
    expect(JSON.stringify(r)).not.toContain("Oferta secreta de A");
  });

  it.each([
    ["inexistente", "99999999-9999-4999-8999-999999999999"],
    ["malformado", "no-es-uuid"],
    ["vacío", ""],
  ])("ID %s no filtra nada para B", async (_e, id) => {
    const db = dbFalsa();
    expect(await svc(db).getWorkflow(B, id)).toBeNull();
  });
});

describe("IDOR workflows — UPDATE / DELETE", () => {
  let db: ReturnType<typeof dbFalsa>;
  beforeEach(() => {
    db = dbFalsa();
  });

  it("B no puede modificar la workflow de A", async () => {
    await svc(db).updateWorkflow(B, WF_A, { name: "HACKED por B" }).catch(() => undefined);
    expect((await svc(db).getWorkflow(A, WF_A))?.name).toBe("Workflow interno de ACME");
  });

  it("B no puede borrar la workflow de A y A la conserva", async () => {
    await svc(db).deleteWorkflow(B, WF_A).catch(() => undefined);
    expect(db.borrada.v).toBe(false);
    expect(await svc(db).getWorkflow(A, WF_A)).not.toBeNull();
  });

  it("toda escritura lleva el tenant autenticado en el SQL", async () => {
    await svc(db).updateWorkflow(B, WF_A, { name: "x" }).catch(() => undefined);
    await svc(db).deleteWorkflow(B, WF_A).catch(() => undefined);
    const escrituras = db.sentencias.filter((s) => /^\s*(UPDATE|DELETE)/i.test(s.sql));
    expect(escrituras.length).toBeGreaterThan(0);
    for (const e of escrituras) {
      expect(e.sql).toMatch(/tenant_id\s*=\s*\$/i);
      expect(e.params).toContain(B);
    }
  });
});

describe("IDOR workflows — ACTION (cambio de estado)", () => {
  let db: ReturnType<typeof dbFalsa>;
  beforeEach(() => {
    db = dbFalsa();
  });

  it("B no puede LANZAR la workflow de A", async () => {
    await svc(db).activateWorkflow(B, WF_A).catch(() => undefined);
    // El estado de A no cambió: sigue en borrador, sin envío.
    expect((await svc(db).getWorkflow(A, WF_A))?.status).toBe("draft");
  });

  it("B no puede PAUSAR la workflow de A", async () => {
    await svc(db).pauseWorkflow(B, WF_A).catch(() => undefined);
    expect((await svc(db).getWorkflow(A, WF_A))?.status).toBe("draft");
  });
});

describe("IDOR workflows — endpoints secundarios con el mismo ID", () => {
  it("getVersions de B sobre el ID de A no devuelve versiones de A", async () => {
    const db = dbFalsa();
    const r = await svc(db).getVersions(B, WF_A).catch(() => []);
    expect(JSON.stringify(r ?? [])).not.toContain("Oferta secreta de A");
    for (const s of db.sentencias) expect(s.params).not.toContain(A);
  });
});

describe("IDOR workflows — el tenant autenticado no se puede sustituir", () => {
  it("un tenant_id ajeno en el payload no altera el scope aplicado", async () => {
    const db = dbFalsa();
    await svc(db)
      .updateWorkflow(B, WF_A, { name: "x", tenant_id: A, workspace_id: A } as never)
      .catch(() => undefined);

    for (const e of db.sentencias.filter((s) => /^\s*UPDATE/i.test(s.sql))) {
      expect(e.params).toContain(B);
      expect(e.params.indexOf(A)).toBe(-1);
    }
    expect((await svc(db).getWorkflow(A, WF_A))?.name).toBe("Workflow interno de ACME");
  });
});
