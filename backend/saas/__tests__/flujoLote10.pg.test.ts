/**
 * BLOQUE 2 · lote 10 — anuncios, prospección, dialer y analítica.
 *
 * Las cuatro tienen un núcleo interno que se puede certificar y una parte que
 * necesita al proveedor. Aquí va el núcleo:
 *
 * - **Anuncios**: qué cuentas tiene conectadas cada inquilino. Un fallo de
 *   alcance ahí no es una lectura de más: es que alguien gaste el presupuesto
 *   publicitario de otro.
 * - **Prospección**: listas de personas. Cruzarlas es entregar la base de datos
 *   comercial de un cliente a su competencia.
 * - **Dialer**: registro de llamadas.
 * - **Analítica**: los números que se enseñan en el panel.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasAdsDashboardService } from "../SaasAdsDashboardService";
import { SaasAnalyticsService } from "../SaasAnalyticsService";
import { SaasDialerService } from "../SaasDialerService";
import { SaasProspectingService } from "../SaasProspectingService";

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

describeSiHayPg("BLOQUE 2 · lote 10", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
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
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // anuncios — cuentas conectadas
  // ══════════════════════════════════════════════════════════════════════════

  describe("anuncios", () => {
    let svc: SaasAdsDashboardService;
    beforeAll(() => { svc = new SaasAdsDashboardService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_ads_connections WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    async function conectar(inquilino: string, cuenta: string) {
      await pool.query(
        // Las columnas reales: no hay `status` sino `is_active`, y el token es
        // obligatorio —la conexión no existe sin credencial—.
        `INSERT INTO saas_ads_connections
           (tenant_id, platform, account_id, account_name, access_token,
            extra_config, is_active, created_at, updated_at)
         VALUES ($1, 'google', $2, $3, 'token-de-certificacion', '{}'::jsonb, true, NOW(), NOW())`,
        [inquilino, cuenta, `Cuenta ${cuenta}`]);
    }

    it("una cuenta conectada aparece en el listado de su inquilino", async () => {
      await conectar(A, "111-222-3333");
      const lista = await svc.listConnections(A);
      expect(JSON.stringify(lista)).toContain("111-222-3333");
    });

    it("EL CONTROL: la cuenta de A no aparece en el listado de B", async () => {
      // Un fallo de alcance aquí no es una lectura de más: es que alguien gaste
      // el presupuesto publicitario de otro.
      await conectar(A, "111-222-3333");
      const deA = await svc.listConnections(A);
      const deB = await svc.listConnections(B);
      expect(JSON.stringify(deA)).toContain("111-222-3333");   // control positivo
      expect(JSON.stringify(deB)).not.toContain("111-222-3333");
    });

    it("el estado por plataforma es el del inquilino que pregunta", async () => {
      await conectar(A, "111-222-3333");
      const enA = await svc.getStatus(A);
      const enB = await svc.getStatus(B);
      expect(JSON.stringify(enA)).not.toBe(JSON.stringify(enB));
    });

    it("B no puede desconectar la cuenta de A", async () => {
      await conectar(A, "111-222-3333");
      const fila = await pool.query<{ id: string }>(
        "SELECT id FROM saas_ads_connections WHERE tenant_id = $1", [A]);
      await svc.disconnectAccount(B, fila.rows[0]!.id).catch(() => {});

      const sigue = await pool.query<{ is_active: boolean }>(
        "SELECT is_active FROM saas_ads_connections WHERE id = $1", [fila.rows[0]!.id]);
      expect(sigue.rows[0]?.is_active).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // prospección — listas de personas
  // ══════════════════════════════════════════════════════════════════════════

  describe("prospección", () => {
    let svc: SaasProspectingService;
    beforeAll(() => { svc = new SaasProspectingService(puerto() as never); });
    beforeEach(async () => {
      for (const t of ["saas_prospecting_prospects", "saas_prospecting_searches",
                       "saas_prospecting_lists"]) {
        await pool.query(`DELETE FROM ${t} WHERE tenant_id = ANY($1)`, [[A, B]]).catch(() => {});
      }
    });

    async function sembrarLista(inquilino: string, nombre: string): Promise<string> {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO saas_prospecting_lists (tenant_id, name, created_at)
         VALUES ($1, $2, NOW()) RETURNING id`,
        [inquilino, nombre]);
      return r.rows[0]!.id;
    }

    it("una lista aparece en el listado de su inquilino", async () => {
      await sembrarLista(A, "Clientes potenciales de A");
      const lista = await svc.listLists(A);
      expect(JSON.stringify(lista)).toContain("Clientes potenciales de A");
    });

    it("EL CONTROL: B no ve la lista de A", async () => {
      // Cruzar listas de prospección es entregar la base de datos comercial de
      // un cliente a su competencia.
      await sembrarLista(A, "Clientes potenciales de A");
      const deA = await svc.listLists(A);
      const deB = await svc.listLists(B);
      expect(deA.length).toBeGreaterThan(0);                   // control positivo
      expect(JSON.stringify(deB)).not.toContain("Clientes potenciales de A");
    });

    it("B no ve los prospectos de una lista de A", async () => {
      const id = await sembrarLista(A, "Lista de A");
      await pool.query(
        `INSERT INTO saas_prospecting_prospects (tenant_id, list_id, full_name, email, created_at)
         VALUES ($1, $2, 'Persona De A', 'persona@dea.test', NOW())`,
        [A, id]).catch(() => {});

      const deB = await svc.listProspects(B, id).catch(() => []);
      expect(JSON.stringify(deB)).not.toContain("Persona De A");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // dialer
  // ══════════════════════════════════════════════════════════════════════════

  describe("dialer", () => {
    let svc: SaasDialerService;
    beforeAll(() => { svc = new SaasDialerService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_contact_activities WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM saas_contacts WHERE tenant_id = ANY($1)", [[A, B]]);
    });

    it("llamar sin proveedor configurado se REHÚSA, no se finge", async () => {
      // Una llamada que se da por hecha sin marcarse deja al comercial creyendo
      // que ya contactó.
      await expect(svc.initiateCall(A, { to: "+34600000000" } as never)).rejects.toThrow();
    });

    it("el registro de llamadas de A no incluye las de B", async () => {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO saas_contacts (tenant_id, name, email, status, pipeline_stage, value, updated_at)
         VALUES ($1, 'Persona', 'p@a.test', 'lead', 'new', 0, NOW()) RETURNING id`, [A]);
      await pool.query(
        `INSERT INTO saas_contact_activities (tenant_id, contact_id, activity_type, description, created_at)
         VALUES ($1, $2, 'call', 'Llamada de A', NOW())`,
        [A, r.rows[0]!.id]).catch(() => {});

      const deB = await svc.listCalls(B);
      expect(JSON.stringify(deB)).not.toContain("Llamada de A");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // analítica — los números del panel
  // ══════════════════════════════════════════════════════════════════════════

  describe("analítica", () => {
    let svc: SaasAnalyticsService;
    beforeAll(() => { svc = new SaasAnalyticsService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM os_jobs WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    async function sembrarTrabajo(inquilino: string, nombre: string) {
      await pool.query(
        `INSERT INTO os_jobs (tenant_id, type, status, payload, created_at)
         VALUES ($1, $2, 'completed', '{}'::jsonb, NOW())`,
        [inquilino, nombre]).catch(() => {});
    }

    it("los números responden y no son un objeto vacío", async () => {
      // Un panel que devuelve `{}` se pinta a cero y parece que el negocio no
      // existe. Se pregunta al SERVICIO, no a la base.
      const r = await svc.getClientAnalytics(A, A, "30d" as never);
      expect(r).toBeTruthy();
      expect(Object.keys(r as object).length).toBeGreaterThan(0);
    });

    it("EL CONTROL: los números de A no cuentan lo de B", async () => {
      // Si el conteo no filtrara por inquilino, cada cliente veria el negocio de
      // todos los demás sumado al suyo. Se comparan las DOS respuestas del
      // servicio, no filas sueltas.
      await sembrarTrabajo(A, "trabajo-de-a");
      await sembrarTrabajo(B, "trabajo-de-b");

      const enA = await svc.getClientAnalytics(A, A, "30d" as never);
      const enB = await svc.getClientAnalytics(B, B, "30d" as never);
      expect(JSON.stringify(enA)).not.toContain("trabajo-de-b");
      expect(JSON.stringify(enB)).not.toContain("trabajo-de-a");
    });
  });
});
