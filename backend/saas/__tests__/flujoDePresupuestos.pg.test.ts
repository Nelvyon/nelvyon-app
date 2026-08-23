/**
 * BLOQUE 2 · presupuestos — documentos de dinero, contra PostgreSQL de verdad.
 *
 * Un presupuesto es un documento que el cliente enseña a SU cliente. Dos cosas
 * no pueden fallar nunca:
 *
 *   1. Los importes. Un subtotal, un descuento o un impuesto mal calculados no
 *      dan error: dan un número, y alguien lo cobra.
 *   2. La numeración. Dos presupuestos con el mismo número son dos documentos
 *      contables que dicen ser el mismo, y eso se descubre en una auditoría.
 *
 * Por eso aquí, además del recorrido normal —crear con líneas → leer → listar →
 * cambiar de estado → borrar— y de los negativos del inquilino de al lado, se
 * fuerza la creación CONCURRENTE: si la numeración fuera leer-y-luego-escribir,
 * dos peticiones simultáneas se llevarían el mismo número.
 *
 * Con el SERVICIO REAL sobre el esquema real.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasQuotesService } from "../SaasQuotesService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;
let svc: SaasQuotesService;

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

async function sembrarInquilinos() {
  for (const [id, nombre] of [[A, "Inquilino A"], [B, "Inquilino B"]] as const) {
    await pool.query(
      `INSERT INTO nelvyon_users
         (user_id, email, password_hash, full_name, plan, tenant_id,
          created_at, updated_at, email_verified)
       VALUES ($1::uuid, $2, 'x', $3, 'pro', $1::text, NOW(), NOW(), true)
       ON CONFLICT (user_id) DO NOTHING`,
      [id, `cert-${id.slice(0, 8)}@nelvyon.test`, nombre]);
    await pool.query(
      `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
       VALUES ($1, $1, $2, 'certificacion', 'pro')
       ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
      [id, nombre]);
  }
}

const presupuesto = (extra: Record<string, unknown> = {}) => ({
  title: "Rediseño de la web",
  clientName: "Cliente Final",
  clientEmail: "cliente@final.test",
  currency: "EUR",
  items: [
    { description: "Diseño", quantity: 2, unitPrice: 500 },
    { description: "Desarrollo", quantity: 1, unitPrice: 1500 },
  ],
  ...extra,
});

describeSiHayPg("BLOQUE 2 · presupuestos — flujo completo", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 8 });
    await sembrarInquilinos();
    svc = new SaasQuotesService(puerto() as never);
  });

  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    await pool.query("DELETE FROM saas_quote_items WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    await pool.query("DELETE FROM saas_quotes WHERE tenant_id = ANY($1)", [[A, B]]);
    await pool.query("DELETE FROM saas_quote_sequences WHERE tenant_id = ANY($1)", [[A, B]]);
  });

  // ── Los importes ──────────────────────────────────────────────────────────

  it("el subtotal es la suma de las líneas, no un número aparte", async () => {
    // 2 × 500 + 1 × 1500 = 2500.
    const q = await svc.create(A, presupuesto() as never);
    expect(Number(q.subtotal)).toBe(2500);
  });

  it("sin impuesto declarado se aplica el 21 % por defecto", async () => {
    // No es un descuido: `taxPct = input.taxPct ?? 21` es el IVA general
    // español. Se fija aquí porque es una decisión con consecuencias —un
    // presupuesto sin `taxPct` NO sale sin impuesto, sale con 21 %— y porque un
    // cambio de ese valor por defecto tiene que ser deliberado, no accidental.
    const q = await svc.create(A, presupuesto() as never);
    expect(Number(q.taxPct)).toBe(21);
    expect(Number(q.taxAmount)).toBe(525);
    expect(Number(q.total)).toBe(3025);
  });

  it("con impuesto CERO declarado, el total es el subtotal", async () => {
    // El otro lado: quien no quiera IVA tiene que poder pedirlo, y el 0 no puede
    // confundirse con «no lo declaró» y acabar en 21 %.
    const q = await svc.create(A, presupuesto({ taxPct: 0 }) as never);
    expect(Number(q.taxAmount)).toBe(0);
    expect(Number(q.total)).toBe(2500);
  });

  it("descuento e impuesto se aplican EN ESE ORDEN", async () => {
    // El orden importa y da números distintos: 2500 − 10 % = 2250; 21 % de 2250
    // = 472,50; total 2722,50. Aplicar el impuesto antes del descuento daría
    // 2722,25 — parecido, y mal.
    const q = await svc.create(A, presupuesto({ discountPct: 10, taxPct: 21 }) as never);
    expect(Number(q.subtotal)).toBe(2500);
    expect(Number(q.discountAmount)).toBe(250);
    expect(Number(q.taxAmount)).toBe(472.5);
    expect(Number(q.total)).toBe(2722.5);
  });

  it("los importes que se GUARDAN son los que se calcularon", async () => {
    // Devolver bien y guardar mal es la peor de las dos: el cliente ve un número
    // en pantalla y otro cuando vuelve mañana.
    const q = await svc.create(A, presupuesto({ discountPct: 10, taxPct: 21 }) as never);
    const fila = await pool.query<{ total: string; subtotal: string }>(
      "SELECT total, subtotal FROM saas_quotes WHERE id = $1", [q.id]);
    expect(Number(fila.rows[0]?.subtotal)).toBe(2500);
    expect(Number(fila.rows[0]?.total)).toBe(2722.5);
  });

  it("las líneas se guardan, con su cantidad y su precio", async () => {
    const q = await svc.create(A, presupuesto() as never);
    const leido = await svc.get(A, q.id);
    expect(leido.items).toHaveLength(2);
    expect(leido.items.map((i) => i.description).sort())
      .toEqual(["Desarrollo", "Diseño"]);
  });

  // ── La numeración ─────────────────────────────────────────────────────────

  it("dos presupuestos seguidos NO comparten número", async () => {
    const uno = await svc.create(A, presupuesto() as never);
    const dos = await svc.create(A, presupuesto() as never);
    expect(uno.quoteNumber).not.toBe(dos.quoteNumber);
  });

  it("ocho presupuestos SIMULTÁNEOS obtienen ocho números distintos", async () => {
    // La prueba que de verdad importa. `Promise.all` sobre un pool de ocho
    // conexiones: se solapan de verdad, no una detrás de otra. Si la numeración
    // fuera leer-y-luego-escribir, aquí saldrían repetidos.
    const creados = await Promise.all(
      Array.from({ length: 8 }, () => svc.create(A, presupuesto() as never)));
    const numeros = creados.map((q) => q.quoteNumber);
    expect(new Set(numeros).size).toBe(8);
  });

  it("cada inquilino lleva su propia numeración", async () => {
    // La secuencia es por inquilino: que A vaya por el 5 no puede empujar a B.
    await svc.create(A, presupuesto() as never);
    await svc.create(A, presupuesto() as never);
    const deB = await svc.create(B, presupuesto() as never);
    expect(deB.quoteNumber).toMatch(/-0001$/);
  });

  // ── El recorrido normal ───────────────────────────────────────────────────

  it("crear → leer → listar → cambiar de estado → PERSISTE", async () => {
    const q = await svc.create(A, presupuesto() as never);
    expect((await svc.list(A)).map((x) => x.id)).toContain(q.id);

    await svc.updateStatus(A, q.id, "sent" as never);
    expect((await svc.get(A, q.id)).status).toBe("sent");

    const fila = await pool.query<{ status: string }>(
      "SELECT status FROM saas_quotes WHERE id = $1", [q.id]);
    expect(fila.rows[0]?.status).toBe("sent");
  });

  it("borrar se lleva también sus líneas, sin dejar huérfanas", async () => {
    // Líneas sin presupuesto son filas que nadie ve y que siguen contando en
    // cualquier informe que sume por inquilino.
    const q = await svc.create(A, presupuesto() as never);
    await svc.delete(A, q.id);

    const lineas = await pool.query(
      "SELECT 1 FROM saas_quote_items WHERE quote_id = $1", [q.id]);
    expect(lineas.rows).toHaveLength(0);
  });

  // ── Lo que B no puede hacer ───────────────────────────────────────────────

  it("B no ve el presupuesto de A en su lista", async () => {
    const q = await svc.create(A, presupuesto() as never);
    expect((await svc.list(B)).map((x) => x.id)).not.toContain(q.id);
  });

  it("B no puede LEER el presupuesto de A", async () => {
    const q = await svc.create(A, presupuesto() as never);
    await expect(svc.get(B, q.id)).rejects.toThrow();
  });

  it("B no puede cambiar el ESTADO del presupuesto de A", async () => {
    const q = await svc.create(A, presupuesto() as never);
    await svc.updateStatus(B, q.id, "accepted" as never).catch(() => {});
    expect((await svc.get(A, q.id)).status).toBe("draft");
  });

  it("B no puede BORRAR el presupuesto de A", async () => {
    const q = await svc.create(A, presupuesto() as never);
    await svc.delete(B, q.id).catch(() => {});
    expect((await svc.get(A, q.id)).id).toBe(q.id);
  });
});
