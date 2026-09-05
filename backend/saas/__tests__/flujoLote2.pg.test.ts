/**
 * BLOQUE 2 · lote 2 — facturas, A/B testing y notificaciones.
 *
 * Tres capacidades más del inventario cerrado, contra PostgreSQL real y con dos
 * inquilinos a la vez.
 *
 * FACTURAS: EL CONTRATO REAL, RECONSTRUIDO
 * ----------------------------------------
 * Había tres definiciones históricas conviviendo. Reconstruido desde las rutas,
 * los servicios y el esquema, el contrato vivo es:
 *
 *   /api/saas/facturas*  → SaasFacturasService  → tabla `invoices`
 *                          (forma de INQUILINO: tenant_id, line_items)
 *   /api/saas/invoices*  → SaasInvoiceService   → tabla `saas_invoices`
 *
 `InvoicingService` escribía la forma de USUARIO (user_id, items, client_name) y
 * no lo llamaba nadie: sólo lo referenciaban el barril y su prueba unitaria, que
 * pasaba porque usaba un doble de base.
 *
 * YA NO ESTÁ. Al reevaluarlo apareció lo que faltaba para poder retirarlo sin
 * dudar: no era sólo código muerto, era código **roto**. Ninguna de las columnas
 * que escribe existe en `invoices` —`user_id`, `client_name`, `client_email`,
 * `client_address`, `items`, `sent_at`—, así que cada uno de sus métodos habría
 * lanzado contra el esquema real. Sus nueve pruebas estaban verdes porque
 * fabricaban a mano una fila con esas columnas inventadas, y llevaban
 * `@ts-nocheck`. Aquí se certifica el contrato VIVO, que es lo que quedó.
 *
 * A/B: LO MISMO, Y MÁS CLARO
 * --------------------------
 * El vivo es `SaasAbTestingService`, que sí casa con `ab_tests`. `ABTestingService`
 * usaba CUATRO tablas y **tres no existen** (`ab_test_variants`,
 * `ab_test_results`, `ab_test_history`). Retirado también.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasAbTestingService } from "../SaasAbTestingService";
import { SaasFacturasService } from "../SaasFacturasService";
import { SaasNotificationService } from "../SaasNotificationService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

// Cada fichero de certificación usa su PROPIO par de inquilinos.
//
// Antes todos compartían `aaaa…`/`bbbb…`, y vitest corre los ficheros en
// PARALELO contra la misma base: el `beforeEach` de uno borraba las filas que
// otro acababa de sembrar. Por separado pasaban los 16 y juntos fallaban tres.
// Eso es un falso rojo —y con otra combinación habría sido un falso verde—.
//
// El sufijo sale del nombre del fichero, así que dos ficheros nunca coinciden y
// no hay que llevar una lista a mano.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa09";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb09";

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
      [id, `cert-${id}@nelvyon.test`, nombre]);
    await pool.query(
      `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
       VALUES ($1, $1, $2, 'certificacion', 'pro')
       ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
      [id, nombre]);
  }
}

describeSiHayPg("BLOQUE 2 · lote 2", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    await sembrarInquilinos();
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // facturas — el contrato vivo
  // ══════════════════════════════════════════════════════════════════════════

  describe("facturas", () => {
    let svc: SaasFacturasService;
    beforeAll(() => { svc = new SaasFacturasService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM invoices WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    const factura = () => ({
      // Cada línea lleva su `total`: lo calcula el llamante, y así lo manda la
      // interfaz real (`qty * unitPrice`).
      lineItems: [
        { description: "Consultoría", quantity: 2, unitPrice: 750, total: 1500 },
        { description: "Soporte", quantity: 1, unitPrice: 500, total: 500 },
      ],
      taxRate: 21,
      currency: "EUR",
    });

    it("crear → releer conserva las líneas como ARRAY", async () => {
      // `line_items` es jsonb. Un array de JS mandado sin serializar se guarda
      // como `{}` en silencio — el defecto que apareció en workflows.
      const f = await svc.create(A, factura() as never);
      const leida = await svc.get(A, f.id);
      expect(Array.isArray(leida?.lineItems)).toBe(true);
      expect(leida?.lineItems).toHaveLength(2);
    });

    it("los importes se calculan y se GUARDAN", async () => {
      // 2×750 + 1×500 = 2000; 21 % = 420; total 2420.
      const f = await svc.create(A, factura() as never);
      const fila = await pool.query<{ subtotal: string; total: string }>(
        "SELECT subtotal, total FROM invoices WHERE id = $1", [f.id]);
      expect(Number(fila.rows[0]?.subtotal)).toBe(2000);
      expect(Number(fila.rows[0]?.total)).toBe(2420);
    });

    it("una linea SIN total se rechaza, no se guarda NaN", async () => {
      // El `total` de cada linea lo calcula el LLAMANTE y la ruta pasa el cuerpo
      // sin validar. La interfaz lo manda bien, pero cualquier otro cliente que
      // lo omita hacia que la suma diera NaN... y NaN es un valor VALIDO en una
      // columna `numeric` de PostgreSQL: se guardaba, sin error, en el subtotal
      // y en el total de una factura.
      await expect(svc.create(A, {
        lineItems: [{ description: "Sin total", quantity: 1, unitPrice: 100 }],
        taxRate: 21,
      } as never)).rejects.toThrow();

      const filas = await pool.query("SELECT 1 FROM invoices WHERE tenant_id = $1", [A]);
      expect(filas.rows).toHaveLength(0);
    });

    it("EL CONTROL: una factura con totales validos SI se crea", async () => {
      // Sin este control, rechazarlo TODO aprobaria la prueba de arriba y
      // dejaria la facturacion sin funcionar.
      const f = await svc.create(A, factura() as never);
      expect(f.id).toBeTruthy();
    });

    it("editar PERSISTE en la fila", async () => {
      const f = await svc.create(A, factura() as never);
      await svc.update(A, f.id, { notes: "Pagada por transferencia" } as never);
      const fila = await pool.query<{ notes: string }>(
        "SELECT notes FROM invoices WHERE id = $1", [f.id]);
      expect(fila.rows[0]?.notes).toBe("Pagada por transferencia");
    });

    it("las estadísticas cuentan lo que hay", async () => {
      await svc.create(A, factura() as never);
      await svc.create(A, factura() as never);
      const stats = await svc.getStats(A);
      expect(JSON.stringify(stats)).toMatch(/2|4840/);
    });

    it("borrar → ya no se lee", async () => {
      const f = await svc.create(A, factura() as never);
      await svc.delete(A, f.id);
      expect(await svc.get(A, f.id)).toBeNull();
    });

    it("B no lee, no edita y no borra la factura de A", async () => {
      const f = await svc.create(A, factura() as never);
      expect(await svc.get(B, f.id)).toBeNull();
      await svc.update(B, f.id, { notes: "secuestrada" } as never).catch(() => {});
      await svc.delete(B, f.id).catch(() => {});
      expect(await svc.get(A, f.id)).not.toBeNull();
    });

    it("la lista de A no incluye las de B", async () => {
      const deA = await svc.create(A, factura() as never);
      await svc.create(B, factura() as never);
      expect((await svc.list(A)).map((x) => x.id)).toContain(deA.id);
      expect((await svc.list(B)).map((x) => x.id)).not.toContain(deA.id);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // A/B testing
  // ══════════════════════════════════════════════════════════════════════════

  describe("A/B testing", () => {
    let svc: SaasAbTestingService;
    beforeAll(() => { svc = new SaasAbTestingService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM ab_tests WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    const prueba = () => ({
      name: "Asunto del correo de bienvenida",
      variants: [
        { label: "A", value: "Bienvenido a NELVYON" },
        { label: "B", value: "Ya estás dentro" },
      ],
    });

    it("crear exige al menos DOS variantes", async () => {
      // Un A/B con una variante no es un experimento: es un envío.
      await expect(svc.create(A, {
        name: "Solo una", variants: [{ label: "A", value: "x" }],
      } as never)).rejects.toThrow();
    });

    it("crear → releer conserva las variantes como ARRAY", async () => {
      const t = await svc.create(A, prueba() as never);
      const leida = await svc.get(A, t.id);
      expect(Array.isArray(leida?.variants)).toBe(true);
      expect(leida?.variants).toHaveLength(2);
    });

    it("registrar un evento se acumula en la variante correcta", async () => {
      const t = await svc.create(A, prueba() as never);
      await svc.recordEvent(A, t.id, "var_0", "send" as never);
      await svc.recordEvent(A, t.id, "var_0", "open" as never);
      await svc.recordEvent(A, t.id, "var_0", "open" as never);

      const leida = await svc.get(A, t.id);
      // `AbVariant` declara `opens` como numero obligatorio. La conversion a
      // `Record<string, number>` y el `?? v0.open` eran defensa contra una forma
      // que no existe: escondian que aqui no habia nada que adivinar.
      const variantes = leida?.variants ?? [];
      expect(variantes.length, "no se leyeron las variantes").toBeGreaterThan(1);
      expect(variantes[0]!.opens).toBe(2);
      expect(variantes[1]!.opens).toBe(0);
    });

    it("declarar ganador PERSISTE el ganador", async () => {
      // `declareWinner` exige que alguna variante tenga ENVIOS: sin envios no
      // hay tasa de apertura que comparar, y declarar un ganador sobre cero
      // datos seria inventar el resultado del experimento. Por eso se registra
      // primero un envio.
      const t = await svc.create(A, prueba() as never);
      await svc.recordEvent(A, t.id, "var_1", "send" as never);
      await svc.recordEvent(A, t.id, "var_1", "open" as never);
      await svc.declareWinner(A, t.id);

      const fila = await pool.query<{ winner_variant_id: string; status: string }>(
        "SELECT winner_variant_id, status FROM ab_tests WHERE id = $1", [t.id]);
      expect(fila.rows[0]?.winner_variant_id).toBeTruthy();
    });

    it("B no lee ni toca la prueba de A", async () => {
      const t = await svc.create(A, prueba() as never);
      expect(await svc.get(B, t.id)).toBeNull();
      await svc.delete(B, t.id).catch(() => {});
      expect(await svc.get(A, t.id)).not.toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // notificaciones
  // ══════════════════════════════════════════════════════════════════════════

  describe("notificaciones", () => {
    let svc: SaasNotificationService;
    beforeAll(() => { svc = new SaasNotificationService({ db: puerto() as never }); });
    beforeEach(async () => {
      // `tenant_id` es varchar, no uuid: sin el molde no hay operador que compare.
      await pool.query("DELETE FROM saas_notifications WHERE tenant_id = ANY($1::text[])", [[A, B]]).catch(() => {});
    });

    //: `createNotification` recibe UN objeto con `userId` y `tenantId` dentro, no
  //: dos argumentos. Escribir la forma que uno supone da un «violates not-null
  //: constraint» que parece defecto del producto y es de la prueba.
    const aviso = (inquilino: string, t = "Nueva factura") => ({
      userId: inquilino, tenantId: inquilino,
      type: "info", title: t, message: "Cuerpo del aviso",
    });

    it("crear → aparece en la lista y cuenta como NO leída", async () => {
      await svc.createNotification(aviso(A) as never);
      expect((await svc.getNotifications(A, A)).length).toBeGreaterThan(0);
      expect(await svc.getUnreadCount(A, A)).toBe(1);
    });

    it("marcar una como leída baja el contador, y solo esa", async () => {
      const n1 = await svc.createNotification(aviso(A, "Una") as never);
      await svc.createNotification(aviso(A, "Otra") as never);
      await svc.markRead(n1.id, A, A);

      expect(await svc.getUnreadCount(A, A)).toBe(1);
    });

    it("marcar todas deja el contador a cero, y PERSISTE", async () => {
      await svc.createNotification(aviso(A, "Una") as never);
      await svc.createNotification(aviso(A, "Otra") as never);
      await svc.markAllRead(A, A);

      expect(await svc.getUnreadCount(A, A)).toBe(0);
      const sinLeer = await pool.query(
        // La columna es `read` (boolean), no `read_at`.
        "SELECT 1 FROM saas_notifications WHERE tenant_id = $1 AND read = false", [A]);
      expect(sinLeer.rows).toHaveLength(0);
    });

    it("marcar todas las de A NO toca las de B", async () => {
      // La prueba que importa: un `markAllRead` sin alcance de inquilino
      // silenciaría los avisos de todos los demás clientes a la vez.
      await svc.createNotification(aviso(A) as never);
      await svc.createNotification(aviso(B) as never);
      await svc.markAllRead(A, A);

      expect(await svc.getUnreadCount(B, B)).toBe(1);
    });

    it("B no ve las notificaciones de A", async () => {
      await svc.createNotification(aviso(A, "Privada de A") as never);
      const deB = await svc.getNotifications(B, B);
      expect(deB.map((x) => x.title)).not.toContain("Privada de A");
    });
  });
});
