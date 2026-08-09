import { beforeEach, describe, expect, it } from "vitest";

/**
 * Matriz IDOR EJECUTABLE para deals.
 *
 * POR QUÉ ESTE FICHERO
 * --------------------
 * `saasDealsTenantIsolation.test.ts` se declaraba a sí mismo "static audit":
 * hacía `readFileSync` del servicio y comprobaba con regex que el SQL contenía
 * `WHERE tenant_id = $1`. Eso verifica que el TEXTO existe, no que el
 * aislamiento funcione. Habría pasado igual con un `tenantId` equivocado, con
 * `undefined`, o con una ruta invocando el método con el tenant del atacante —
 * que es exactamente el fallo real que apareció en OsCompetitorGapService.
 *
 * Aquí se ejecuta el servicio de verdad contra una DB falsa que **respeta el
 * filtro presente en el SQL**: solo devuelve o afecta la fila cuando el
 * parámetro de tenant coincide. No se mockea el control que se certifica; se
 * mockea únicamente el motor que lo aplicaría. Si el servicio omitiera el
 * filtro, la fila saldría y el test fallaría.
 */
import { SaasDealsService } from "../SaasDealsService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const DEAL_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type Fila = Record<string, unknown>;

/**
 * Postgres falso con una única fila, propiedad de A.
 *
 * Honra el filtro tal y como lo haría el motor: si la sentencia contiene
 * `tenant_id = $n`, la fila solo se devuelve/afecta cuando ese parámetro es el
 * tenant dueño. Si el servicio NO filtrara, la fila se devolvería siempre y las
 * aserciones cross-tenant fallarían — que es justo lo que queremos detectar.
 */
function dbFalsa() {
  const fila: Fila = {
    id: DEAL_A,
    tenant_id: A,
    title: "Contrato ACME",
    value: "10000",
    stage: "propuesta",
    contact_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
  const borrada = { v: false };
  const sentencias: Array<{ sql: string; params: unknown[] }> = [];

  const port = {
    query: async (sql: string, params: unknown[] = []) => {
      sentencias.push({ sql, params });
      const filtraTenant = /tenant_id\s*=\s*\$\d/i.test(sql);
      const tenantDeLaLlamada = params.find((p) => p === A || p === B);
      const idDeLaLlamada = params.find((p) => typeof p === "string" && /^[0-9a-f-]{36}$/i.test(String(p)) && p !== A && p !== B);

      // Sin filtro de tenant en el SQL la fila sale siempre: eso haría fallar
      // las aserciones cross-tenant, que es el comportamiento deseado del test.
      const tenantOk = !filtraTenant || tenantDeLaLlamada === fila.tenant_id;
      const idOk = idDeLaLlamada === undefined || idDeLaLlamada === fila.id;
      const visible = tenantOk && idOk && !borrada.v;

      if (/^\s*DELETE/i.test(sql)) {
        if (visible) borrada.v = true;
        return [];
      }
      if (/^\s*UPDATE/i.test(sql)) {
        if (!visible) return [];
        // Refleja el cambio para poder comprobar persistencia después.
        const nuevoTitulo = params.find((p) => typeof p === "string" && String(p).startsWith("HACK"));
        if (nuevoTitulo) fila.title = nuevoTitulo;
        return [{ ...fila }];
      }
      return visible ? [{ ...fila }] : [];
    },
  } as unknown as SaasPostgresPort;

  return { port, sentencias, fila, borrada };
}

describe("IDOR deals — LIST", () => {
  it("A ve su deal", async () => {
    const db = dbFalsa();
    const r = await new SaasDealsService(db.port).listDeals(A);
    expect(r).toHaveLength(1);
  });

  it("B NO ve el deal de A", async () => {
    const db = dbFalsa();
    const r = await new SaasDealsService(db.port).listDeals(B);
    expect(r).toHaveLength(0);
    expect(JSON.stringify(r)).not.toContain("Contrato ACME");
  });

  it("el listado filtra por tenant en el SQL", async () => {
    const db = dbFalsa();
    await new SaasDealsService(db.port).listDeals(B);
    expect(db.sentencias[0]!.sql).toMatch(/tenant_id\s*=\s*\$/i);
    expect(db.sentencias[0]!.params).toContain(B);
  });
});

describe("IDOR deals — READ con el UUID exacto de A", () => {
  it("A lo obtiene", async () => {
    const db = dbFalsa();
    expect(await new SaasDealsService(db.port).getDeal(A, DEAL_A)).not.toBeNull();
  });

  it("B con el UUID de A obtiene null, no datos", async () => {
    const db = dbFalsa();
    const r = await new SaasDealsService(db.port).getDeal(B, DEAL_A);
    expect(r).toBeNull();
  });

  it.each([
    ["inexistente", "99999999-9999-4999-8999-999999999999"],
    ["malformado", "no-es-un-uuid"],
    ["vacío", ""],
  ])("ID %s no filtra nada para B", async (_etiqueta, id) => {
    const db = dbFalsa();
    const r = await new SaasDealsService(db.port).getDeal(B, id);
    expect(r).toBeNull();
  });
});

describe("IDOR deals — UPDATE / DELETE / ACTION", () => {
  let db: ReturnType<typeof dbFalsa>;
  beforeEach(() => {
    db = dbFalsa();
  });

  it("B no puede modificar el deal de A", async () => {
    const svc = new SaasDealsService(db.port);
    await expect(svc.updateDeal(B, DEAL_A, { title: "HACKED por B" })).rejects.toBeTruthy();
    // Persistencia: A sigue viendo su título original.
    expect((await svc.getDeal(A, DEAL_A))?.title).toBe("Contrato ACME");
  });

  it("B no puede borrar el deal de A y A lo sigue teniendo", async () => {
    const svc = new SaasDealsService(db.port);
    await svc.deleteDeal(B, DEAL_A).catch(() => undefined);
    expect(db.borrada.v).toBe(false);
    expect(await svc.getDeal(A, DEAL_A)).not.toBeNull();
  });

  it("B no puede cambiar la etapa (ACTION) del deal de A", async () => {
    const svc = new SaasDealsService(db.port);
    await svc.changeStage(B, DEAL_A, "ganado").catch(() => undefined);
    // El estado de A no cambió.
    expect((await svc.getDeal(A, DEAL_A))?.stage).toBe("propuesta");
  });

  it("toda escritura lleva el tenant en el SQL", async () => {
    const svc = new SaasDealsService(db.port);
    await svc.updateDeal(B, DEAL_A, { title: "x" }).catch(() => undefined);
    await svc.deleteDeal(B, DEAL_A).catch(() => undefined);
    const escrituras = db.sentencias.filter((s) => /^\s*(UPDATE|DELETE)/i.test(s.sql));
    expect(escrituras.length).toBeGreaterThan(0);
    for (const e of escrituras) {
      expect(e.sql).toMatch(/tenant_id\s*=\s*\$/i);
      expect(e.params).toContain(B);
    }
  });
});

describe("IDOR deals — el tenant autenticado no se puede sustituir", () => {
  it("un tenantId en los datos del cliente no altera el scope aplicado", async () => {
    const db = dbFalsa();
    const svc = new SaasDealsService(db.port);
    // El cliente intenta colar el tenant de A dentro del payload.
    await svc
      .updateDeal(B, DEAL_A, { title: "x", tenant_id: A, workspace_id: A } as never)
      .catch(() => undefined);

    const escrituras = db.sentencias.filter((s) => /^\s*UPDATE/i.test(s.sql));
    for (const e of escrituras) {
      // El tenant que viaja al SQL es el AUTENTICADO (B), nunca el del payload.
      expect(e.params).toContain(B);
      expect(e.params.indexOf(A)).toBe(-1);
    }
    expect((await svc.getDeal(A, DEAL_A))?.title).toBe("Contrato ACME");
  });
});
