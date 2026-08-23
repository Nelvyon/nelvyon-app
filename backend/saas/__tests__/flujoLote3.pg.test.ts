/**
 * BLOQUE 2 · lote 3 — GDPR, panel y PWA.
 *
 * GDPR es la más seria de las tres: no es una funcionalidad, es una obligación
 * legal. «La interfaz dice que se borró» y la fila sigue ahí no es un fallo de
 * producto, es un incumplimiento. Por eso aquí no se comprueba lo que devuelve
 * la llamada: se comprueba en la BASE que los datos ya no están.
 *
 * Y el otro lado, que importa igual: borrar los datos de A **no** puede llevarse
 * los de B. Un borrado sin alcance de inquilino que se ejecute una vez no tiene
 * vuelta atrás.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasDashboardService } from "../SaasDashboardService";
import { SaasGdprService } from "../SaasGdprService";
import { SaasPwaService } from "../SaasPwaService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

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

/** Un contacto por inquilino, que es lo que el borrado tiene que llevarse. */
async function sembrarContacto(inquilino: string, nombre: string): Promise<string> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO saas_contacts (tenant_id, name, email, status, pipeline_stage, value, updated_at)
     VALUES ($1, $2, $3, 'lead', 'new', 0, NOW()) RETURNING id`,
    [inquilino, nombre, `${nombre.toLowerCase().replace(/ /g, ".")}@cliente.test`]);
  return r.rows[0]!.id;
}

describeSiHayPg("BLOQUE 2 · lote 3", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    await sembrarInquilinos();
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // GDPR
  // ══════════════════════════════════════════════════════════════════════════

  describe("GDPR", () => {
    let svc: SaasGdprService;
    beforeAll(() => { svc = new SaasGdprService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_contacts WHERE tenant_id = ANY($1)", [[A, B]]);
      await pool.query("DELETE FROM saas_gdpr_requests WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM saas_notifications WHERE tenant_id = ANY($1::text[])", [[A, B]]).catch(() => {});
    });

    it("una solicitud de exportación queda REGISTRADA", async () => {
      // Que la petición exista es la mitad del cumplimiento: hay que poder
      // demostrar cuándo se pidió y cuándo se atendió.
      await svc.requestExport(A, A);
      const filas = await pool.query(
        "SELECT 1 FROM saas_gdpr_requests WHERE tenant_id = $1", [A]);
      expect(filas.rows.length).toBeGreaterThan(0);
    });

    it("la exportación del INTERESADO devuelve sus datos, no un objeto vacío", async () => {
      // `exportUserData` es por USUARIO —el interesado—, no por inquilino: es lo
      // correcto para el derecho de acceso. Lo del inquilino entero es
      // `exportTenantBundle`, y va aparte.
      //
      // Mi primera versión sembraba un contacto del CRM y esperaba verlo aquí.
      // No aparecía, y parecía una exportación incompleta: era la prueba, que
      // medía la función equivocada. Una exportación vacía cumple la forma y no
      // cumple la obligación, así que se comprueba con un dato que SÍ es del
      // interesado.
      await pool.query(
        `INSERT INTO saas_notifications (user_id, tenant_id, type, title, message)
         VALUES ($1, $2, 'info', 'Aviso exportable', 'cuerpo')`,
        [A, A]);

      const datos = await svc.exportUserData(A, A);
      expect(JSON.stringify(datos)).toContain("Aviso exportable");
    });

    it("la exportación del interesado de A NO incluye lo de B", async () => {
      await pool.query(
        `INSERT INTO saas_notifications (user_id, tenant_id, type, title, message)
         VALUES ($1, $2, 'info', 'Aviso de B', 'cuerpo')`,
        [B, B]);

      const datos = await svc.exportUserData(A, A);
      expect(JSON.stringify(datos)).not.toContain("Aviso de B");
    });

    it("borrar un contacto lo quita DE LA BASE, no solo de la respuesta", async () => {
      const id = await sembrarContacto(A, "Persona Borrable");
      await svc.deleteContactById(A, id);

      const filas = await pool.query("SELECT 1 FROM saas_contacts WHERE id = $1", [id]);
      expect(filas.rows).toHaveLength(0);
    });

    it("EL CONTROL: borrar el contacto de A NO toca los de B", async () => {
      // Un borrado sin alcance de inquilino que se ejecute una vez no tiene
      // vuelta atrás. Esta es la prueba que no puede faltar.
      const idA = await sembrarContacto(A, "Persona De A");
      const idB = await sembrarContacto(B, "Persona De B");
      await svc.deleteContactById(A, idA);

      const quedaB = await pool.query("SELECT 1 FROM saas_contacts WHERE id = $1", [idB]);
      expect(quedaB.rows).toHaveLength(1);
    });

    it("B no puede borrar el contacto de A pasándole su id", async () => {
      const idA = await sembrarContacto(A, "Persona De A");
      await svc.deleteContactById(B, idA).catch(() => {});

      const sigue = await pool.query("SELECT 1 FROM saas_contacts WHERE id = $1", [idA]);
      expect(sigue.rows).toHaveLength(1);
    });

    it("el bundle del inquilino no arrastra al vecino", async () => {
      await sembrarContacto(A, "Persona De A");
      await sembrarContacto(B, "Persona De B");
      const bundle = await svc.exportTenantBundle(A);
      expect(JSON.stringify(bundle)).not.toContain("Persona De B");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // panel
  // ══════════════════════════════════════════════════════════════════════════

  describe("panel", () => {
    let svc: SaasDashboardService;
    beforeAll(() => { svc = new SaasDashboardService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_activity_log WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    it("una actividad registrada aparece en la actividad reciente", async () => {
      await svc.logActivity(A, "contact.created", "Se creó un contacto");
      const reciente = await svc.getRecentActivity(A);
      expect(reciente.map((x) => x.description)).toContain("Se creó un contacto");
    });

    it("la actividad de A no incluye la de B", async () => {
      await svc.logActivity(A, "contact.created", "Actividad de A");
      await svc.logActivity(B, "contact.created", "Actividad de B");

      const reciente = await svc.getRecentActivity(A);
      expect(reciente.map((x) => x.description)).not.toContain("Actividad de B");
    });

    it("las métricas responden con números, no con un objeto vacío", async () => {
      // Un panel que devuelve `{}` se pinta vacío y parece que no hay negocio.
      const m = await svc.getDashboardMetrics(A);
      expect(m).toBeTruthy();
      expect(Object.keys(m as object).length).toBeGreaterThan(0);
    });

    it("el resumen de un inquilino que no existe no inventa datos", async () => {
      await expect(svc.getDashboardSummary("00000000-0000-4000-8000-000000000000"))
        .rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PWA
  // ══════════════════════════════════════════════════════════════════════════

  describe("PWA", () => {
    let svc: SaasPwaService;
    beforeAll(() => { svc = new SaasPwaService(puerto() as never); });
    beforeEach(async () => {
      for (const t of ["saas_pwa_push_queue", "saas_pwa_push_subscriptions", "saas_pwa_installs"]) {
        await pool.query(`DELETE FROM ${t} WHERE tenant_id = ANY($1)`, [[A, B]]).catch(() => {});
      }
    });

    const suscripcion = (endpoint: string) => ({
      endpoint, p256dh: "clave-publica", auth: "secreto",
    });

    it("el manifiesto se construye y lleva lo mínimo de una PWA", async () => {
      const m = await svc.buildManifest(A);
      expect(m.name ?? m.short_name).toBeTruthy();
      expect(Array.isArray(m.icons)).toBe(true);
    });

    it("registrar una instalación se cuenta", async () => {
      await svc.recordInstall(A, { platform: "android" } as never);
      const stats = await svc.getInstallStats(A);
      expect(JSON.stringify(stats)).toMatch(/1|android/);
    });

    it("guardar una suscripción y contarla", async () => {
      await svc.savePushSubscription(A, suscripcion("https://push.test/a1") as never);
      expect(await svc.countPushSubscriptions(A)).toBe(1);
    });

    it("guardar dos veces el MISMO endpoint no duplica", async () => {
      // Un endpoint duplicado manda el aviso dos veces al mismo dispositivo.
      await svc.savePushSubscription(A, suscripcion("https://push.test/a1") as never);
      await svc.savePushSubscription(A, suscripcion("https://push.test/a1") as never);
      expect(await svc.countPushSubscriptions(A)).toBe(1);
    });

    it("retirar la suscripción la quita", async () => {
      await svc.savePushSubscription(A, suscripcion("https://push.test/a1") as never);
      await svc.removePushSubscription(A, "https://push.test/a1");
      expect(await svc.countPushSubscriptions(A)).toBe(0);
    });

    it("las suscripciones de B no cuentan para A", async () => {
      await svc.savePushSubscription(A, suscripcion("https://push.test/a1") as never);
      await svc.savePushSubscription(B, suscripcion("https://push.test/b1") as never);
      expect(await svc.countPushSubscriptions(A)).toBe(1);
      expect(await svc.countPushSubscriptions(B)).toBe(1);
    });

    it("un aviso encolado para A no llega a los dispositivos de B", async () => {
      // El fallo grave de esta capacidad: mandar la notificación de un cliente a
      // los dispositivos de otro.
      await svc.savePushSubscription(A, suscripcion("https://push.test/a1") as never);
      await svc.savePushSubscription(B, suscripcion("https://push.test/b1") as never);
      await svc.enqueuePushNotification(A, { title: "Solo para A", body: "x" } as never);

      const cola = await pool.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM saas_pwa_push_queue");
      expect(cola.rows.every((r) => r.tenant_id === A)).toBe(true);
    });
  });
});
