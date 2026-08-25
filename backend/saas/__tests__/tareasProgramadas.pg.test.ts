/**
 * BLOQUE 4 · tareas programadas: dos planificadores, una publicación.
 *
 * Un cron no se dispara una vez. Se dispara cuando la plataforma decide, y las
 * plataformas reintentan: dos regiones, un despliegue a mitad, un tiempo de
 * espera agotado que se reintenta. Si dos disparos reclaman el mismo post
 * programado, el cliente publica dos veces en su propio perfil — y eso no se
 * puede deshacer con un `ROLLBACK`.
 *
 * La reclamación se hace empujando `scheduled_at` hacia delante con
 * `FOR UPDATE SKIP LOCKED`, que es lo que convierte «seleccionar y publicar» en
 * «reclamar y publicar». Estas pruebas van contra PostgreSQL real porque
 * `SKIP LOCKED` no existe en un doble: un doble acepta el SQL y no bloquea nada.
 *
 * Se salta sin `NELVYON_B4_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN = process.env.NELVYON_B4_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaad01";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbd01";

/**
 * La reclamación, tal como la hace `processDueScheduled`.
 *
 * Se replica la sentencia para poder ejecutarla desde dos conexiones a la vez
 * sin arrastrar el servicio entero y sus dependencias. Es la misma consulta, y
 * una prueba de abajo comprueba que sigue siéndolo.
 */
const RECLAMAR = `
  UPDATE saas_social_posts AS p
     SET scheduled_at = NOW() + INTERVAL '10 minutes', updated_at = NOW()
   WHERE p.id IN (
     SELECT id FROM saas_social_posts
      WHERE status = 'scheduled' AND scheduled_at <= NOW() AND tenant_id = $1
      ORDER BY scheduled_at ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
   )
   RETURNING p.id`;

/** Cuentas sociales por inquilino: el post tiene clave ajena a una de ellas. */
const cuentas = new Map<string, string>();

async function cuentaDe(tenantId: string): Promise<string> {
  const cacheada = cuentas.get(tenantId);
  if (cacheada) return cacheada;
  const r = await pool.query<{ id: string }>(
    `INSERT INTO saas_social_accounts
       (tenant_id, platform, account_id, account_name, access_token, is_active,
        created_at, updated_at)
     VALUES ($1, 'meta', 'cuenta-cert', 'Cuenta de certificacion',
             'token-de-certificacion', true, NOW(), NOW())
     RETURNING id`,
    [tenantId],
  );
  const id = r.rows[0]!.id;
  cuentas.set(tenantId, id);
  return id;
}

async function sembrarPost(tenantId: string, cuandoMinutos: number): Promise<string> {
  const cuenta = await cuentaDe(tenantId);
  const r = await pool.query<{ id: string }>(
    `INSERT INTO saas_social_posts
       (tenant_id, social_account_id, platform, content, media_urls, status,
        scheduled_at, created_at, updated_at)
     VALUES ($1, $2, 'meta', 'contenido de prueba', ARRAY[]::text[], 'scheduled',
             NOW() + ($3 || ' minutes')::interval, NOW(), NOW())
     RETURNING id`,
    [tenantId, cuenta, String(cuandoMinutos)],
  );
  return r.rows[0]!.id;
}

describeSiHayPg("BLOQUE 4 · reclamación de tareas programadas", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 8 });

    for (const [id, nombre] of [[A, "Inquilino A"], [B, "Inquilino B"]] as const) {
      await pool.query(
        `INSERT INTO nelvyon_users
           (user_id, email, password_hash, full_name, plan, tenant_id,
            created_at, updated_at, email_verified)
         VALUES ($1::uuid, $2, 'x', $3, 'pro', $1::text, NOW(), NOW(), true)
         ON CONFLICT (user_id) DO NOTHING`,
        [id, `cert-cron-${id}@nelvyon.test`, nombre],
      );
      await pool.query(
        `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
         VALUES ($1, $1, $2, 'certificacion', 'pro')
         ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
        [id, nombre],
      );
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM saas_social_posts WHERE tenant_id = ANY($1::uuid[])", [[A, B]]);
    await pool.query("DELETE FROM saas_social_accounts WHERE tenant_id = ANY($1::uuid[])", [[A, B]]);
    cuentas.clear();
  });

  it("EL CONTROL: un post vencido SÍ se reclama", async () => {
    // Sin esto, una reclamación que no devolviera nunca nada pasaría las pruebas
    // de duplicado y dejaría los posts programados sin publicar para siempre.
    await sembrarPost(A, -5);
    const r = await pool.query(RECLAMAR, [A]);
    expect(r.rows).toHaveLength(1);
  });

  it("un post que aún NO vence no se reclama", async () => {
    // Publicar antes de tiempo es tan malo como no publicar: el cliente
    // programó una hora por algo.
    await sembrarPost(A, 30);
    const r = await pool.query(RECLAMAR, [A]);
    expect(r.rows).toHaveLength(0);
  });

  it("DOS planificadores concurrentes reclaman el post UNA sola vez", async () => {
    // El caso real: la plataforma dispara el cron dos veces. Publicar dos veces
    // en el perfil del cliente no se puede deshacer.
    await sembrarPost(A, -5);

    const [uno, dos] = await Promise.all([pool.query(RECLAMAR, [A]), pool.query(RECLAMAR, [A])]);
    const total = uno.rows.length + dos.rows.length;
    expect(total, "el mismo post se reclamo dos veces").toBe(1);
  });

  it("SEIS planificadores concurrentes siguen reclamando una sola vez", async () => {
    await sembrarPost(A, -5);
    const rondas = await Promise.all(Array.from({ length: 6 }, () => pool.query(RECLAMAR, [A])));
    const total = rondas.reduce((n, r) => n + r.rows.length, 0);
    expect(total).toBe(1);
  });

  it("con varios posts vencidos, cada uno se reclama exactamente una vez", async () => {
    // La invariante que no depende de cómo el planificador reparta el trabajo:
    // la suma de lo reclamado por todos es igual al número de posts vencidos.
    const cuantos = 5;
    for (let i = 0; i < cuantos; i++) await sembrarPost(A, -5 - i);

    const rondas = await Promise.all(Array.from({ length: 4 }, () => pool.query<{ id: string }>(RECLAMAR, [A])));
    const ids = rondas.flatMap((r) => r.rows.map((x) => x.id));

    expect(ids).toHaveLength(cuantos);
    expect(new Set(ids).size, "algun post se reclamo dos veces").toBe(cuantos);
  });

  it("una reclamación aplaza el post: no se vuelve a coger de inmediato", async () => {
    // Es lo que hace que un fallo de publicación se reintente más tarde en vez
    // de entrar en un bucle: el post vuelve dentro de diez minutos.
    await sembrarPost(A, -5);
    expect((await pool.query(RECLAMAR, [A])).rows).toHaveLength(1);
    expect((await pool.query(RECLAMAR, [A])).rows).toHaveLength(0);
  });

  it("EL AISLAMIENTO: el planificador de A no reclama los posts de B", async () => {
    await sembrarPost(A, -5);
    await sembrarPost(B, -5);

    const deA = await pool.query<{ id: string }>(RECLAMAR, [A]);
    expect(deA.rows).toHaveLength(1); // control positivo

    const quedanDeB = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM saas_social_posts
        WHERE tenant_id = $1 AND status = 'scheduled' AND scheduled_at <= NOW()`,
      [B],
    );
    expect(Number(quedanDeB.rows[0]!.n), "reclamo un post de otro inquilino").toBe(1);
  });

  it("un post ya publicado no se vuelve a reclamar", async () => {
    // Estado terminal. Reclamarlo publicaría el mismo contenido otra vez.
    const id = await sembrarPost(A, -5);
    await pool.query(
      "UPDATE saas_social_posts SET status='published', published_at=NOW() WHERE id=$1",
      [id],
    );
    expect((await pool.query(RECLAMAR, [A])).rows).toHaveLength(0);
  });

  it("la sentencia replicada sigue siendo la del servicio", async () => {
    // La consulta está duplicada por necesidad -hace falta ejecutarla desde dos
    // conexiones-. Si la del servicio cambia y esta no, estas pruebas
    // certificarían código que ya no corre.
    const { readFileSync, existsSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    let d = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (existsSync(join(d, "apps", "web", "vitest.config.ts"))) break;
      d = dirname(d);
    }
    const texto = readFileSync(join(d, "backend", "saas", "SaasSocialService.ts"), "utf8");

    // Las tres decisiones que hacen segura la reclamación.
    expect(texto).toContain("FOR UPDATE SKIP LOCKED");
    expect(texto).toMatch(/scheduled_at = NOW\(\) \+ INTERVAL '10 minutes'/);
    expect(texto).toMatch(/status = 'scheduled' AND scheduled_at <= NOW\(\)/);
  });
});
