/**
 * BLOQUE 8 · la idempotencia con peticiones simultáneas de verdad.
 *
 * Una propiedad de idempotencia comprobada en serie no está comprobada. «Llamo
 * dos veces y la segunda dice duplicado» funciona con cualquier implementación,
 * incluida la que consulta primero y escribe después — que es la que se rompe
 * cuando las dos llamadas ocurren **a la vez**, porque las dos consultan antes
 * de que ninguna escriba y las dos creen ser la primera.
 *
 * Y esa no es la situación rara: es la normal. Los proveedores de webhooks
 * reintentan contra el balanceador con tiempos de espera cortos, así que el
 * reintento suele llegar mientras la primera entrega todavía se está
 * procesando.
 *
 * Aquí se lanzan N reclamaciones **de la misma clave a la vez** contra
 * PostgreSQL real y se exige que exactamente una gane. La garantía es un
 * `INSERT ... ON CONFLICT DO NOTHING RETURNING`, que resuelve la carrera donde
 * se puede resolver: en el índice único, no en la aplicación.
 *
 * Se prueba contra PostgreSQL REAL a propósito: con un doble en memoria estaría
 * probando mi doble, y la propiedad la garantiza una restricción del esquema.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

const USUARIO = "8c000000-0000-4000-8000-00000000c001";
const WS = 970082;
const FUENTE = "carga-b8";
let TENANT = "";

let pool: import("pg").Pool;
let reclamar: (
  db: { query: <T>(sql: string, p?: unknown[]) => Promise<T[]> },
  tenantId: string,
  source: string,
  key: string,
) => Promise<boolean>;

/** Adaptador mínimo: `reclamarEntregaPersistente` solo necesita `query`. */
function puerto(p: import("pg").Pool) {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await p.query(sql, params);
      return r.rows as T[];
    },
  };
}

async function limpiar(): Promise<void> {
  if (!pool) return;
  await pool
    .query(`DELETE FROM erp_idempotency_keys WHERE domain LIKE $1`, [`%${FUENTE}%`])
    .catch(() => null);
  await pool.query(`DELETE FROM saas_tenants WHERE user_id = $1`, [USUARIO]);
  await pool.query(`DELETE FROM workspaces WHERE id = $1`, [WS]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id = $1`, [USUARIO]);
}

beforeAll(async () => {
  if (!hayBase) return;
  process.env.DATABASE_URL = DSN;
  const { Pool } = await import("pg");
  // Pool holgado: lo que se quiere provocar es concurrencia REAL contra la base,
  // no una cola de espera por conexiones.
  pool = new Pool({ connectionString: DSN, max: 20 });
  await limpiar();
  await pool.query(
    `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
     VALUES ($1,'idem-b8@ejemplo.test','x','Idem B8','pro')`,
    [USUARIO],
  );
  await pool.query(`INSERT INTO workspaces (id, user_id, name) VALUES ($1,$2,'WS Idem')`, [
    WS,
    USUARIO,
  ]);
  const t = await pool.query(
    `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, workspace_id)
     VALUES ($1,'Empresa Idem','tech','pro',true,$2) RETURNING id`,
    [USUARIO, WS],
  );
  TENANT = t.rows[0].id;
  const mod = await import("../webhookInIdempotency");
  reclamar = mod.reclamarEntregaPersistente as never;
});

beforeEach(async () => {
  if (!hayBase) return;
  await pool.query(`DELETE FROM erp_idempotency_keys WHERE domain LIKE $1`, [`%${FUENTE}%`]);
});

afterAll(async () => {
  if (!pool) return;
  await limpiar();
  await pool.end();
});

soloConBase("BLOQUE 8 · la misma clave, treinta veces a la vez", () => {
  it("EXACTAMENTE UNA reclamación gana", async () => {
    /**
     * El corazón del bloque. Treinta reclamaciones simultáneas de la misma
     * clave: si ganan dos, el webhook se procesa dos veces y el cliente recibe
     * dos correos, o se le cobra dos veces.
     */
    const N = 30;
    const t = Date.now();
    const rs = await Promise.all(
      Array.from({ length: N }, () => reclamar(puerto(pool), TENANT, FUENTE, "clave-comun")),
    );
    const ms = Date.now() - t;
    const ganadoras = rs.filter(Boolean).length;
    console.info(`${N} reclamaciones simultaneas de la misma clave en ${ms}ms: ${ganadoras} ganadora(s)`);

    expect(
      ganadoras,
      `ganaron ${ganadoras} reclamaciones de la misma clave: la entrega se procesaria ${ganadoras} veces`,
    ).toBe(1);
  }, 60_000);

  it("EL CONTROL: claves DISTINTAS ganan todas", async () => {
    /**
     * Sin este control, una implementación que devolviera siempre `false`
     * pasaría el caso de arriba y descartaría **todas** las entregas — una
     * avería silenciosa mucho peor que un duplicado.
     */
    const N = 30;
    const rs = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        reclamar(puerto(pool), TENANT, FUENTE, `clave-distinta-${i}`),
      ),
    );
    expect(rs.filter(Boolean), "se descartaron entregas legitimas").toHaveLength(N);
  }, 60_000);

  it("dos INQUILINOS con la misma clave no se pisan", async () => {
    /**
     * La clave de idempotencia la elige el proveedor, no NELVYON. Dos clientes
     * distintos pueden mandar `evt_1` perfectamente. Si la reclamación no
     * estuviera acotada por inquilino, el webhook del segundo se descartaría
     * como duplicado del primero — y sería un descarte silencioso.
     */
    // `saas_tenants.user_id` es UNICO: un usuario, un inquilino. Hace falta un
    // segundo usuario de verdad, no reusar el primero.
    const USUARIO_B = "8c000000-0000-4000-8000-00000000c002";
    await pool.query(
      `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
       VALUES ($1,'idem-b8-b@ejemplo.test','x','Idem B8 B','pro')
       ON CONFLICT (user_id) DO NOTHING`,
      [USUARIO_B],
    );
    // Y `workspace_id` tambien es unico: cada inquilino, su workspace.
    const WS_B = 970083;
    await pool.query(`INSERT INTO workspaces (id, user_id, name) VALUES ($1,$2,'WS Idem B')
       ON CONFLICT (id) DO NOTHING`, [WS_B, USUARIO_B]);
    const otro = await pool.query(
      `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, workspace_id)
       VALUES ($1,'Empresa Idem 2','tech','pro',true,$2) RETURNING id`,
      [USUARIO_B, WS_B],
    );
    const tenantB = otro.rows[0].id as string;
    try {
      const [a, b] = await Promise.all([
        reclamar(puerto(pool), TENANT, FUENTE, "evt_1"),
        reclamar(puerto(pool), tenantB, FUENTE, "evt_1"),
      ]);
      expect(a, "el inquilino A no pudo reclamar su propia clave").toBe(true);
      expect(b, "el inquilino B vio su webhook descartado como duplicado del de A").toBe(true);
    } finally {
      await pool.query(`DELETE FROM saas_tenants WHERE id = $1`, [tenantB]);
      await pool.query(`DELETE FROM workspaces WHERE id = $1`, [WS_B]);
      await pool.query(`DELETE FROM nelvyon_users WHERE user_id = $1`, [USUARIO_B]);
    }
  }, 60_000);

  it("dos FUENTES del mismo inquilino con la misma clave no se pisan", async () => {
    // Dos proveedores distintos numeran sus eventos por su cuenta: `1` de Stripe
    // y `1` de Slack no son el mismo evento.
    const [a, b] = await Promise.all([
      reclamar(puerto(pool), TENANT, `${FUENTE}-stripe`, "1"),
      reclamar(puerto(pool), TENANT, `${FUENTE}-slack`, "1"),
    ]);
    expect(a && b, "dos fuentes distintas compartieron el espacio de claves").toBe(true);
  }, 60_000);

  it("la reclamación PERSISTE: reintentar más tarde sigue siendo duplicado", async () => {
    /**
     * Un `Map` en memoria pasaría los casos de arriba y fallaría este en cuanto
     * el proceso se reiniciara. Aquí se comprueba contra la fila, que es lo que
     * sobrevive.
     */
    expect(await reclamar(puerto(pool), TENANT, FUENTE, "persistente")).toBe(true);
    const r = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM erp_idempotency_keys
        WHERE tenant_id = $1 AND idem_key = $2`,
      [TENANT, "persistente"],
    );
    expect(Number(r.rows[0]?.n), "la reclamacion no dejo fila: no sobrevive a un reinicio").toBe(1);
    expect(await reclamar(puerto(pool), TENANT, FUENTE, "persistente")).toBe(false);
  }, 60_000);

  it("sin clave se procesa, no se descarta en silencio", () => {
    /**
     * Decisión escrita en el propio servicio y que conviene fijar: sin clave de
     * idempotencia no hay nada que deduplicar, y es preferible procesar dos
     * veces algo que nadie ha marcado a descartarlo sin decírselo a nadie.
     */
    return Promise.all([
      expect(reclamar(puerto(pool), TENANT, FUENTE, "")).resolves.toBe(true),
      expect(reclamar(puerto(pool), TENANT, FUENTE, "   ")).resolves.toBe(true),
    ]);
  }, 60_000);
});
