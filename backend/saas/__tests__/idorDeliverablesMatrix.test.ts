import { describe, expect, it } from "vitest";

/**
 * Matriz IDOR EJECUTABLE para entregables.
 *
 * Este recurso NO se aísla por `tenant_id` directo como los otros cinco. Su
 * cadena real, leída del servicio, es de dos pasos:
 *
 *     tenant_id  ->  saas_tenants.workspace_id  ->  os_deliverables.workspace_id
 *
 * Por eso el fixture modela los DOS pasos: el tenant A resuelve a workspace 1,
 * el tenant B a workspace 2, y el entregable de A vive en workspace 1. Copiar
 * el molde tenant-scoped de los otros recursos habría producido un test verde
 * que no prueba nada, porque el filtro que importa aquí es `workspace_id`.
 *
 * El servicio tiene además una segunda vía —`saas_recurring_deliverables`, esa
 * sí filtrada por `tenant_id`— que se ejercita en el mismo recorrido.
 */
import { SaasDeliverablesHubService } from "../SaasDeliverablesHubService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const WS_A = 1;
const WS_B = 2;
const DELIV_A = "0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a";

function dbFalsa() {
  const entregableDeA = {
    id: DELIV_A,
    type: "landing",
    title: "Landing confidencial de ACME",
    status: "approved",
    file_url: "https://files.local/entregable-de-A.zip",
    metadata: { pack_id: "local-business-growth", qa_score: 92, legal_passed: true },
    created_at: "2026-01-01T00:00:00Z",
    approved_at: "2026-01-02T00:00:00Z",
  };
  const sentencias: Array<{ sql: string; params: unknown[] }> = [];

  const port = {
    query: async (sql: string, params: unknown[] = []) => {
      sentencias.push({ sql, params });

      // Paso 1: resolución tenant -> workspace. Cada tenant su workspace.
      if (/FROM saas_tenants/i.test(sql)) {
        if (params[0] === A) return [{ workspace_id: WS_A }];
        if (params[0] === B) return [{ workspace_id: WS_B }];
        return [];
      }

      // Paso 2: os_deliverables filtrado por workspace_id, como hace el SQL real.
      if (/FROM os_deliverables/i.test(sql)) {
        const filtra = /workspace_id\s*=\s*\$\d/i.test(sql);
        const ws = params.find((p) => typeof p === "number");
        const id = params.find((p) => typeof p === "string");
        // Sin filtro de workspace la fila sale siempre: así el test detecta la fuga.
        const visible = (!filtra || ws === WS_A) && (id === undefined || id === DELIV_A);
        return visible ? [{ ...entregableDeA }] : [];
      }

      // Vía recurrente, filtrada por tenant_id.
      if (/FROM saas_recurring_deliverables/i.test(sql)) {
        const filtra = /tenant_id\s*=\s*\$\d/i.test(sql);
        const tenant = params.find((p) => p === A || p === B);
        return !filtra || tenant === A ? [] : [];
      }

      return [];
    },
  } as unknown as SaasPostgresPort;

  return { port, sentencias, entregableDeA };
}

const svc = (d: ReturnType<typeof dbFalsa>) => new SaasDeliverablesHubService(d.port);

describe("entregables — la cadena tenant → workspace se resuelve por tenant", () => {
  it("A resuelve a su workspace y B al suyo, nunca al de A", async () => {
    const d = dbFalsa();
    await svc(d).getDeliverable(A, DELIV_A).catch(() => undefined);
    await svc(d).getDeliverable(B, DELIV_A).catch(() => undefined);

    const resoluciones = d.sentencias.filter((s) => /FROM saas_tenants/i.test(s.sql));
    expect(resoluciones[0]!.params).toContain(A);
    expect(resoluciones[1]!.params).toContain(B);

    // El workspace que viaja a os_deliverables es el del tenant que pregunta.
    const consultas = d.sentencias.filter((s) => /FROM os_deliverables/i.test(s.sql));
    expect(consultas[0]!.params).toContain(WS_A);
    expect(consultas[1]!.params).toContain(WS_B);
    expect(consultas[1]!.params).not.toContain(WS_A);
  });
});

describe("IDOR entregables — READ con el UUID exacto de A", () => {
  it("A obtiene su entregable", async () => {
    const d = dbFalsa();
    const r = await svc(d).getDeliverable(A, DELIV_A);
    expect(r.title).toBe("Landing confidencial de ACME");
  });

  it("B con el UUID de A no lo obtiene ni ve su URL de descarga", async () => {
    const d = dbFalsa();
    const r = await svc(d).getDeliverable(B, DELIV_A).catch(() => null);
    const s = JSON.stringify(r ?? {});
    expect(s).not.toContain("Landing confidencial de ACME");
    expect(s).not.toContain("entregable-de-A.zip");
  });

  it("la consulta de B lleva SIEMPRE su propio workspace en el SQL", async () => {
    const d = dbFalsa();
    await svc(d).getDeliverable(B, DELIV_A).catch(() => undefined);
    for (const c of d.sentencias.filter((s) => /FROM os_deliverables/i.test(s.sql))) {
      expect(c.sql).toMatch(/workspace_id\s*=\s*\$/i);
      expect(c.params).toContain(WS_B);
      expect(c.params).not.toContain(WS_A);
    }
  });

  it.each([
    ["inexistente", "99999999-9999-4999-8999-999999999999"],
    ["malformado", "no-es-uuid"],
    ["vacío", ""],
  ])("ID %s no filtra nada para B", async (_e, id) => {
    const d = dbFalsa();
    const r = await svc(d).getDeliverable(B, id).catch(() => null);
    expect(JSON.stringify(r ?? {})).not.toContain("entregable-de-A.zip");
  });
});

describe("IDOR entregables — LIST / resumen", () => {
  it("el resumen de B no incluye datos de A", async () => {
    const d = dbFalsa();
    const r = await svc(d).getSummary(B).catch(() => null);
    expect(JSON.stringify(r ?? {})).not.toContain("Landing confidencial de ACME");
  });

  it("ninguna consulta de B lleva el workspace de A", async () => {
    const d = dbFalsa();
    await svc(d).getSummary(B).catch(() => undefined);
    for (const s of d.sentencias.filter((x) => /os_deliverables/i.test(x.sql))) {
      expect(s.params).not.toContain(WS_A);
    }
  });
});

describe("IDOR entregables — persistencia del recurso de A", () => {
  it("tras los intentos de B, A conserva su entregable intacto", async () => {
    const d = dbFalsa();
    await svc(d).getDeliverable(B, DELIV_A).catch(() => undefined);
    await svc(d).getSummary(B).catch(() => undefined);

    const comoA = await svc(d).getDeliverable(A, DELIV_A);
    expect(comoA.title).toBe("Landing confidencial de ACME");
    expect(comoA.status).toBe("approved");
    expect(comoA.downloadUrl).toBe("https://files.local/entregable-de-A.zip");
    expect(comoA.qaScore).toBe(92);
  });
});
