import { beforeEach, describe, expect, it } from "vitest";

/**
 * Matriz IDOR EJECUTABLE para documentos.
 *
 * Dos particularidades de este servicio, leídas del código y no supuestas:
 *
 *   - La inyección es `{ db }` dentro de `deps`, con fallback a
 *     `DbClient.getInstance()`. El fixture pasa el puerto explícitamente para
 *     que nunca se toque una base real.
 *   - En el SQL el ID es `$1` y el tenant `$2` — orden inverso al de deals,
 *     contactos, campañas y workflows. Asumir el orden habría producido un
 *     fixture que "pasa" sin probar nada.
 *   - `DOC_SEL` aliasea a camelCase (`tenant_id as "tenantId"`), así que la
 *     fila cruda ya viaja con esos nombres.
 */
import { SaasDocumentsService } from "../SaasDocumentsService";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const DOC_A = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function dbFalsa() {
  const fila: Record<string, unknown> = {
    id: DOC_A,
    tenantId: A,
    contactId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Contrato confidencial ACME",
    type: "contract",
    status: "draft",
    templateId: null,
    fileUrl: "https://files.local/secreto-de-A.pdf",
    signedAt: null,
    expiresAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
  const borrada = { v: false };
  const sentencias: Array<{ sql: string; params: unknown[] }> = [];

  const db = {
    query: async (sql: string, params: unknown[] = []) => {
      sentencias.push({ sql, params });
      const filtra = /tenant_id\s*=\s*\$\d/i.test(sql);
      const tenant = params.find((p) => p === A || p === B);
      const id = params.find(
        (p) => typeof p === "string" && /^[0-9a-f-]{36}$/i.test(String(p)) && p !== A && p !== B,
      );
      // Sin filtro de tenant en el SQL la fila sale siempre: el test detecta
      // la fuga en lugar de taparla.
      const visible =
        (!filtra || tenant === fila.tenantId) &&
        (id === undefined || id === fila.id) &&
        !borrada.v;

      if (/^\s*DELETE/i.test(sql)) {
        if (!visible) return [];
        borrada.v = true;
        return [{ id: fila.id }];
      }
      if (/^\s*UPDATE/i.test(sql)) {
        if (!visible) return [];
        const nuevoNombre = params.find((p) => typeof p === "string" && String(p).startsWith("HACK"));
        if (nuevoNombre) fila.name = nuevoNombre;
        const nuevoEstado = params.find((p) => p === "signed" || p === "void");
        if (nuevoEstado) fila.status = nuevoEstado;
        return [{ ...fila }];
      }
      return visible ? [{ ...fila }] : [];
    },
  };

  return { db, sentencias, fila, borrada };
}

const svc = (d: ReturnType<typeof dbFalsa>) =>
  new SaasDocumentsService({ db: d.db as never });

describe("IDOR documentos — LIST", () => {
  it("A ve su documento", async () => {
    const d = dbFalsa();
    expect(await svc(d).listDocuments(A)).toHaveLength(1);
  });

  it("B NO ve el documento de A ni su URL de fichero", async () => {
    const d = dbFalsa();
    const r = await svc(d).listDocuments(B);
    expect(r).toHaveLength(0);
    const s = JSON.stringify(r);
    expect(s).not.toContain("Contrato confidencial ACME");
    expect(s).not.toContain("secreto-de-A.pdf");
  });

  it("el listado filtra por tenant en el SQL", async () => {
    const d = dbFalsa();
    await svc(d).listDocuments(B);
    expect(d.sentencias[0]!.sql).toMatch(/tenant_id\s*=\s*\$/i);
    expect(d.sentencias[0]!.params).toContain(B);
  });
});

describe("IDOR documentos — READ con el UUID exacto de A", () => {
  it("A lo obtiene", async () => {
    const d = dbFalsa();
    expect(await svc(d).getDocument(A, DOC_A)).not.toBeNull();
  });

  it("B con el UUID de A obtiene null y no ve la URL del fichero", async () => {
    const d = dbFalsa();
    const r = await svc(d).getDocument(B, DOC_A);
    expect(r).toBeNull();
    expect(JSON.stringify(r)).not.toContain("secreto-de-A.pdf");
  });

  it.each([
    ["inexistente", "99999999-9999-4999-8999-999999999999"],
    ["malformado", "no-es-uuid"],
    ["vacío", ""],
  ])("ID %s no filtra nada para B", async (_e, id) => {
    const d = dbFalsa();
    expect(await svc(d).getDocument(B, id)).toBeNull();
  });
});

describe("IDOR documentos — UPDATE / DELETE", () => {
  let d: ReturnType<typeof dbFalsa>;
  beforeEach(() => {
    d = dbFalsa();
  });

  it("B no puede modificar el documento de A", async () => {
    const r = await svc(d).updateDocument(B, DOC_A, { name: "HACKED por B" }).catch(() => null);
    expect(r).toBeNull();
    // Persistencia: nombre, estado y fichero de A intactos.
    const comoA = await svc(d).getDocument(A, DOC_A);
    expect(comoA?.name).toBe("Contrato confidencial ACME");
    expect(comoA?.status).toBe("draft");
    expect(comoA?.fileUrl).toBe("https://files.local/secreto-de-A.pdf");
  });

  it("B no puede firmar (ACTION vía status) el documento de A", async () => {
    await svc(d).updateDocument(B, DOC_A, { status: "signed" }).catch(() => undefined);
    expect((await svc(d).getDocument(A, DOC_A))?.status).toBe("draft");
  });

  it("B no puede borrar el documento de A y A lo conserva", async () => {
    const ok = await svc(d).deleteDocument(B, DOC_A).catch(() => false);
    expect(ok).toBe(false);
    expect(d.borrada.v).toBe(false);
    expect(await svc(d).getDocument(A, DOC_A)).not.toBeNull();
  });

  it("la asociación con el contacto de A no se altera", async () => {
    await svc(d).updateDocument(B, DOC_A, { name: "HACK" }).catch(() => undefined);
    expect((await svc(d).getDocument(A, DOC_A))?.contactId).toBe(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
  });

  it("toda escritura lleva el tenant autenticado en el SQL", async () => {
    await svc(d).updateDocument(B, DOC_A, { name: "x" }).catch(() => undefined);
    await svc(d).deleteDocument(B, DOC_A).catch(() => undefined);
    const escrituras = d.sentencias.filter((s) => /^\s*(UPDATE|DELETE)/i.test(s.sql));
    expect(escrituras.length).toBeGreaterThan(0);
    for (const e of escrituras) {
      expect(e.sql).toMatch(/tenant_id\s*=\s*\$/i);
      expect(e.params).toContain(B);
    }
  });
});

describe("IDOR documentos — el tenant autenticado no se puede sustituir", () => {
  it("un tenantId ajeno en el patch no altera el scope aplicado", async () => {
    const d = dbFalsa();
    await svc(d)
      .updateDocument(B, DOC_A, { name: "x", tenantId: A, workspaceId: A } as never)
      .catch(() => undefined);

    for (const e of d.sentencias.filter((s) => /^\s*UPDATE/i.test(s.sql))) {
      expect(e.params).toContain(B);
      expect(e.params.indexOf(A)).toBe(-1);
    }
    expect((await svc(d).getDocument(A, DOC_A))?.name).toBe("Contrato confidencial ACME");
  });
});
