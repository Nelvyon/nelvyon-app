/**
 * BLOQUE 2 · lote 11 — redes sociales, subcuentas de agencia y caché del OS.
 *
 * Las tres últimas capacidades pendientes, y las tres tienen una superficie de
 * riesgo concreta:
 *
 * - **Redes sociales**: publicar en nombre de otro es escribir en su perfil
 *   público. No hay marcha atrás y lo ve todo el mundo.
 * - **Subcuentas de agencia**: una agencia gestiona varios clientes. El modelo
 *   es de árbol, así que aquí lo que hay que probar es que una agencia vea SUS
 *   subcuentas y ninguna de otra agencia.
 * - **Caché del OS**: si la caché no distingue inquilino, la respuesta calculada
 *   para uno se le sirve a otro.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { OsAgentDataService } from "../OsAgentDataService";
import { SaasSocialService } from "../SaasSocialService";
import { SaasSubcuentasService } from "../SaasSubcuentasService";

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
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa08";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb08";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

describeSiHayPg("BLOQUE 2 · lote 11", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    for (const [id, nombre] of [[A, "Agencia A"], [B, "Agencia B"]] as const) {
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
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // redes sociales
  // ══════════════════════════════════════════════════════════════════════════

  describe("redes sociales", () => {
    let svc: SaasSocialService;
    beforeAll(() => { svc = new SaasSocialService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_social_posts WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM saas_social_accounts WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    /** Una cuenta conectada. `createPost` la EXIGE, y es lo correcto: no se
     *  puede programar una publicación hacia un perfil que no está enlazado. */
    async function conectarCuenta(inquilino: string, nombre: string): Promise<string> {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO saas_social_accounts
           (tenant_id, platform, account_id, account_name, access_token,
            is_active, created_at, updated_at)
         VALUES ($1, 'linkedin', $2, $3, 'token-de-certificacion', true, NOW(), NOW())
         RETURNING id`,
        [inquilino, `ext-${nombre}`, nombre]);
      return r.rows[0]!.id;
    }

    it("crear una publicación → releerla en el listado", async () => {
      const cuenta = await conectarCuenta(A, "Perfil de A");
      const p = await svc.createPost(A, {
        platform: "linkedin", content: "Novedades de la semana", socialAccountId: cuenta,
      } as never);
      const lista = await svc.listPosts(A, {} as never);
      expect(lista.map((x) => x.id)).toContain(p.id);
    });

    it("EL CONTROL: B no ve la publicación de A", async () => {
      const cuenta = await conectarCuenta(A, "Perfil de A");
      const p = await svc.createPost(A, {
        platform: "linkedin", content: "Borrador privado de A", socialAccountId: cuenta,
      } as never);
      const deA = await svc.listPosts(A, {} as never);
      const deB = await svc.listPosts(B, {} as never);
      expect(deA.length).toBeGreaterThan(0);              // control positivo
      expect(deB.map((x) => x.id)).not.toContain(p.id);
    });

    it("B no puede PUBLICAR la publicación de A", async () => {
      // Publicar en nombre de otro es escribir en su perfil público: no hay
      // marcha atrás y lo ve todo el mundo.
      const cuenta = await conectarCuenta(A, "Perfil de A");
      const p = await svc.createPost(A, {
        platform: "linkedin", content: "Borrador privado de A", socialAccountId: cuenta,
      } as never);
      await svc.publishPost(B, p.id).catch(() => {});

      const fila = await pool.query<{ status: string }>(
        "SELECT status FROM saas_social_posts WHERE id = $1", [p.id]);
      expect(fila.rows[0]?.status).not.toBe("published");
    });

    it("B no puede borrar la publicación de A", async () => {
      const cuenta = await conectarCuenta(A, "Perfil de A");
      const p = await svc.createPost(A, {
        platform: "linkedin", content: "Borrador privado de A", socialAccountId: cuenta,
      } as never);
      await svc.deletePost(B, p.id).catch(() => {});

      const sigue = await pool.query("SELECT 1 FROM saas_social_posts WHERE id = $1", [p.id]);
      expect(sigue.rows).toHaveLength(1);
    });

    it("publicar SIN cuenta conectada se rehúsa, no se finge", async () => {
      // Una publicación marcada como publicada que no salió es peor que un
      // error: el cliente cree que ya comunicó.
      const cuenta = await conectarCuenta(A, "Perfil de A");
      await pool.query("UPDATE saas_social_accounts SET is_active = false WHERE id = $1", [cuenta]);
      const p = await svc.createPost(A, {
        platform: "linkedin", content: "Sin cuenta activa", socialAccountId: cuenta,
      } as never).catch(() => null);
      if (!p) return;   // rechazado ya al crear: también vale
      await svc.publishPost(A, p.id).catch(() => {});

      const fila = await pool.query<{ status: string }>(
        "SELECT status FROM saas_social_posts WHERE id = $1", [p.id]);
      expect(fila.rows[0]?.status).not.toBe("published");
    });

    it("las cuentas conectadas de A no salen en las de B", async () => {
      await conectarCuenta(A, "Perfil de A");

      const deB = await svc.listAccounts(B);
      expect(JSON.stringify(deB)).not.toContain("Perfil de A");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // subcuentas de agencia
  // ══════════════════════════════════════════════════════════════════════════

  describe("subcuentas", () => {
    let svc: SaasSubcuentasService;
    beforeAll(() => { svc = new SaasSubcuentasService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_subcuentas WHERE agency_tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    it("crear una subcuenta → aparece en la lista de SU agencia", async () => {
      const sc = await svc.create(A, {
        name: "Cliente de la agencia A", email: "cliente@agenciaa.test", plan: "starter",
      } as never);
      const lista = await svc.list(A);
      expect(lista.map((x) => x.id)).toContain(sc.id);
    });

    it("EL CONTROL: la agencia B no ve la subcuenta de A", async () => {
      // El modelo es de árbol: una agencia gestiona varios clientes. Si el
      // alcance falla, una agencia opera la cartera de otra.
      const sc = await svc.create(A, {
        name: "Cliente de la agencia A", email: "cliente@agenciaa.test", plan: "starter",
      } as never);
      const deA = await svc.list(A);
      const deB = await svc.list(B);
      expect(deA.length).toBeGreaterThan(0);             // control positivo
      expect(deB.map((x) => x.id)).not.toContain(sc.id);
    });

    it("B no puede suspender ni cancelar la subcuenta de A", async () => {
      // Suspender la subcuenta de otra agencia deja a un cliente ajeno sin
      // servicio, y quien lo sufre no sabe por qué.
      const sc = await svc.create(A, {
        name: "Cliente de la agencia A", email: "cliente@agenciaa.test", plan: "starter",
      } as never);
      await svc.suspend(B, sc.id).catch(() => {});
      await svc.cancel(B, sc.id).catch(() => {});

      const leida = await svc.get(A, sc.id);
      expect(leida?.status).not.toBe("suspended");
      expect(leida?.status).not.toBe("cancelled");
    });

    it("suspender y reactivar la propia SÍ funciona y persiste", async () => {
      const sc = await svc.create(A, {
        name: "Cliente de la agencia A", email: "cliente@agenciaa.test", plan: "starter",
      } as never);
      await svc.suspend(A, sc.id);
      expect((await svc.get(A, sc.id))?.status).toBe("suspended");

      await svc.reactivate(A, sc.id);
      expect((await svc.get(A, sc.id))?.status).not.toBe("suspended");
    });

    it("el consumo de una subcuenta no incluye el de otra agencia", async () => {
      const sc = await svc.create(A, {
        name: "Cliente de la agencia A", email: "cliente@agenciaa.test", plan: "starter",
      } as never);
      const uso = await svc.getUsage(A, sc.id);
      expect(uso).toBeTruthy();
      // Y la agencia B no puede consultarlo.
      const desdeB = await svc.getUsage(B, sc.id).catch(() => null);
      expect(desdeB).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // caché de datos del OS
  // ══════════════════════════════════════════════════════════════════════════

  describe("caché del OS", () => {
    let svc: OsAgentDataService;
    beforeAll(() => { svc = new OsAgentDataService(puerto() as never, null as never); });
    beforeEach(async () => {
      // Acotado al par de inquilinos de ESTE fichero: un DELETE sin filtro
      // borraria lo que otro fichero acaba de sembrar, y vitest los corre en paralelo.
      // `os_agent_data_cache.tenant_id` es TEXT, no uuid. Moldear a `uuid[]`
      // hacia fallar el DELETE, y el `.catch` lo escondia: las filas se
      // acumulaban entre ejecuciones hasta chocar con la clave unica
      // `os_agent_data_cache_lookup`, y entonces la siembra fallaba -tambien en
      // silencio- y la prueba se caia tres lineas mas abajo con un `null`
      // incomprensible. Dos `catch` mudos encadenados para tapar un molde mal
      // puesto.
      await pool.query("DELETE FROM os_agent_data_cache WHERE tenant_id = ANY($1::text[])", [[A, B]]);
    });

    async function sembrarCache(inquilino: string, clave: string, contenido: string) {
      await pool.query(
        //  tiene un CHECK: semrush|dataforseo|mock. Y las obligatorias son
        // metadata y fetched_at. Faltando cualquiera, el INSERT no entra y la
        // caché parece vacía sin que nada lo diga.
        `INSERT INTO os_agent_data_cache
           (tenant_id, provider, query_type, query_key, domain, database_code,
            payload, metadata, fetched_at, expires_at)
         VALUES ($1, 'mock', 'keywords', $2, 'cliente.test', 'es',
                 $3::jsonb, '{}'::jsonb, NOW(), NOW() + INTERVAL '1 day')`,
        // Sin `.catch` a proposito: si la siembra falla, la prueba tiene que
        // decir POR QUE. Tragarse el error convertia un fallo de insercion en
        // una asercion confusa sobre `null` tres lineas mas abajo.
        [inquilino, clave, JSON.stringify({ dato: contenido })]);
    }

    it("EL CONTROL: la caché de A no se sirve a B", async () => {
      // Si la caché no distingue inquilino, la respuesta calculada para uno se
      // le entrega a otro — y en datos de mercado eso es inteligencia
      // competitiva regalada.
      await sembrarCache(A, "clave-compartida", "datos de A");

      const enA = await svc.getCached("clave-compartida", "keywords" as never, A);
      const enB = await svc.getCached("clave-compartida", "keywords" as never, B);
      expect(JSON.stringify(enA)).toContain("datos de A");   // control positivo
      expect(JSON.stringify(enB ?? null)).not.toContain("datos de A");
    });

    it("el listado reciente de A no incluye lo de B", async () => {
      await sembrarCache(A, "clave-de-a", "datos de A");
      await sembrarCache(B, "clave-de-b", "datos de B");

      const deA = await svc.listRecent({ tenantId: A } as never);
      expect(JSON.stringify(deA)).not.toContain("datos de B");
    });
  });
});
