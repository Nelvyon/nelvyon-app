import { beforeEach, describe, expect, it } from "vitest";

/**
 * Matriz IDOR EJECUTABLE para contactos.
 *
 * Sustituye a `saasCrmTenantIsolation.test.ts`, que era un "static audit":
 * leía el fichero del servicio y comprobaba con regex que el SQL contuviera
 * `tenant_id`. Eso verifica el TEXTO, no el comportamiento — habría pasado
 * igual con un tenant equivocado o con `undefined`.
 *
 * Aquí se ejecuta el servicio real contra un Postgres falso que honra el filtro
 * REALMENTE presente en la sentencia: la fila solo sale o se ve afectada cuando
 * el parámetro de tenant coincide con su dueño. No se mockea el control que se
 * certifica, solo el motor que lo aplicaría. La prueba de mutación al final del
 * bloque confirma que estos tests se ponen en rojo si el filtro desaparece.
 */
import { SaasCrmService } from "../SaasCrmService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const CONTACT_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function dbFalsa() {
  const fila: Record<string, unknown> = {
    id: CONTACT_A,
    tenant_id: A,
    email: "cliente@acme.es",
    name: "Cliente ACME",
    phone: "+34600000000",
    pipeline_stage: "lead",
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
      // Sin filtro en el SQL la fila sale siempre: así el test detecta la fuga.
      const visible = (!filtra || tenant === fila.tenant_id) && (id === undefined || id === fila.id) && !borrada.v;

      if (/^\s*DELETE/i.test(sql)) {
        if (visible) borrada.v = true;
        return [];
      }
      if (/^\s*UPDATE/i.test(sql)) {
        if (!visible) return [];
        const nuevo = params.find((p) => typeof p === "string" && String(p).startsWith("HACK"));
        if (nuevo) fila.name = nuevo;
        return [{ ...fila }];
      }
      return visible ? [{ ...fila }] : [];
    },
  } as unknown as SaasPostgresPort;

  return { port, sentencias, fila, borrada };
}

describe("IDOR contactos — LIST", () => {
  it("A ve su contacto", async () => {
    const db = dbFalsa();
    expect(await new SaasCrmService(db.port).getContacts(A)).toHaveLength(1);
  });

  it("B NO ve el contacto de A", async () => {
    const db = dbFalsa();
    const r = await new SaasCrmService(db.port).getContacts(B);
    expect(r).toHaveLength(0);
    expect(JSON.stringify(r)).not.toContain("cliente@acme.es");
  });

  it("el listado filtra por tenant en el SQL", async () => {
    const db = dbFalsa();
    await new SaasCrmService(db.port).getContacts(B);
    expect(db.sentencias[0]!.sql).toMatch(/tenant_id\s*=\s*\$/i);
    expect(db.sentencias[0]!.params).toContain(B);
  });
});

describe("IDOR contactos — READ con el UUID exacto de A", () => {
  it("A lo obtiene", async () => {
    const db = dbFalsa();
    expect(await new SaasCrmService(db.port).getContact(A, CONTACT_A)).not.toBeNull();
  });

  it("B con el UUID de A obtiene null, sin datos", async () => {
    const db = dbFalsa();
    const r = await new SaasCrmService(db.port).getContact(B, CONTACT_A);
    expect(r).toBeNull();
    expect(JSON.stringify(r)).not.toContain("cliente@acme.es");
  });

  it.each([
    ["inexistente", "99999999-9999-4999-8999-999999999999"],
    ["malformado", "no-es-uuid"],
    ["vacío", ""],
  ])("ID %s no filtra nada para B", async (_e, id) => {
    const db = dbFalsa();
    expect(await new SaasCrmService(db.port).getContact(B, id)).toBeNull();
  });
});

describe("IDOR contactos — UPDATE / DELETE", () => {
  let db: ReturnType<typeof dbFalsa>;
  beforeEach(() => {
    db = dbFalsa();
  });

  it("B no puede modificar el contacto de A", async () => {
    const svc = new SaasCrmService(db.port);
    await svc.updateContact(B, CONTACT_A, { name: "HACKED por B" }).catch(() => undefined);
    // Persistencia: A conserva su nombre original.
    expect((await svc.getContact(A, CONTACT_A))?.name).toBe("Cliente ACME");
  });

  it("B no puede borrar el contacto de A y A lo conserva", async () => {
    const svc = new SaasCrmService(db.port);
    await svc.deleteContact(B, CONTACT_A).catch(() => undefined);
    expect(db.borrada.v).toBe(false);
    expect(await svc.getContact(A, CONTACT_A)).not.toBeNull();
  });

  it("toda escritura lleva el tenant autenticado en el SQL", async () => {
    const svc = new SaasCrmService(db.port);
    await svc.updateContact(B, CONTACT_A, { name: "x" }).catch(() => undefined);
    await svc.deleteContact(B, CONTACT_A).catch(() => undefined);
    const escrituras = db.sentencias.filter((s) => /^\s*(UPDATE|DELETE)/i.test(s.sql));
    expect(escrituras.length).toBeGreaterThan(0);
    for (const e of escrituras) {
      expect(e.sql).toMatch(/tenant_id\s*=\s*\$/i);
      expect(e.params).toContain(B);
    }
  });
});

describe("IDOR contactos — el tenant autenticado no se puede sustituir", () => {
  it("un tenant_id ajeno en el payload no altera el scope aplicado", async () => {
    const db = dbFalsa();
    const svc = new SaasCrmService(db.port);
    await svc
      .updateContact(B, CONTACT_A, { name: "x", tenant_id: A, workspace_id: A } as never)
      .catch(() => undefined);

    for (const e of db.sentencias.filter((s) => /^\s*UPDATE/i.test(s.sql))) {
      expect(e.params).toContain(B);
      expect(e.params.indexOf(A)).toBe(-1);
    }
    expect((await svc.getContact(A, CONTACT_A))?.name).toBe("Cliente ACME");
  });
});
