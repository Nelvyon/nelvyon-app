/**
 * BLOQUE 7 · revocar una clave la revoca DE VERDAD.
 *
 * Esta suite existe por un resultado de mutación, y merece que quede escrito.
 *
 * `laClaveDeApiComoCredencial.test.ts` prueba la puerta con un doble de
 * `verifyKey`, y entre sus casos hay tres que dicen «una clave revocada no
 * entra», «una desactivada no entra», «una caducada no entra». Los tres estaban
 * verdes. Pero al mutar la consulta de producción —quitarle
 * `active=TRUE AND revoked_at IS NULL`— **los tres siguieron verdes**.
 *
 * Claro que sí: interrogaban a mi doble. La decisión no vive en TypeScript, vive
 * en un `WHERE` de PostgreSQL, y un negativo verde no certifica una defensa si
 * la ejecución nunca la alcanza.
 *
 * Así que la revocación se comprueba donde se decide: contra PostgreSQL real,
 * con filas de verdad en `api_keys`, escribiendo la clave y revocándola.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

const USUARIO = "55555555-5555-4555-8555-555555555555";
const WS = 970055;
const NOMBRE = "clave-de-certificacion-bloque-7";

// `api_keys.tenant_id` referencia a `saas_tenants(id)`, que a su vez cuelga de
// `nelvyon_users` y de `workspaces`. Hay que montar la cadena entera: una
// fixture rota deja los siete ataques «saltados», que es la peor forma de pasar
// porque no hay nada rojo que mirar.
let TENANT = "";

let pool: import("pg").Pool;
let verifyKey: (raw: string) => Promise<{ tenantId: string; keyId: string } | null>;

/** Igual que el servicio: `nlv_` + 48 hex. */
function claveNueva(semilla: string): string {
  return "nlv_" + crypto.createHash("sha256").update(semilla).digest("hex").slice(0, 48);
}

async function insertar(raw: string, over: Record<string, unknown> = {}): Promise<void> {
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  await pool.query(
    `INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, scopes, active, expires_at, revoked_at, created_by)
     VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8,$9)`,
    [
      TENANT,
      NOMBRE,
      hash,
      raw.slice(0, 12),
      ["contacts.read"],
      over.active ?? true,
      over.expires_at ?? null,
      over.revoked_at ?? null,
      USUARIO,
    ],
  );
}

beforeAll(async () => {
  if (!hayBase) return;
  process.env.DATABASE_URL = DSN;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });
  await limpiar();
  await pool.query(
    `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
     VALUES ($1,'claves@ejemplo.test','x','Usuario Claves','pro')
     ON CONFLICT (user_id) DO NOTHING`,
    [USUARIO],
  );
  await pool.query(
    `INSERT INTO workspaces (id, user_id, name) VALUES ($1,$2,'WS Claves')
     ON CONFLICT (id) DO NOTHING`,
    [WS, USUARIO],
  );
  const t = await pool.query(
    `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, workspace_id)
     VALUES ($1,'Empresa Claves','tech','pro',true,$2) RETURNING id`,
    [USUARIO, WS],
  );
  TENANT = t.rows[0].id;
  const mod = await import("../SaasApiKeysService");
  mod.resetSaasApiKeysServiceForTests();
  verifyKey = (raw) => mod.getSaasApiKeysService().verifyKey(raw) as never;
});

beforeEach(async () => {
  if (hayBase) await pool.query(`DELETE FROM api_keys WHERE name = $1`, [NOMBRE]);
});

async function limpiar(): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM api_keys WHERE name = $1`, [NOMBRE]);
  await pool.query(`DELETE FROM saas_tenants WHERE user_id = $1`, [USUARIO]);
  await pool.query(`DELETE FROM workspaces WHERE id = $1`, [WS]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id = $1`, [USUARIO]);
}

afterAll(async () => {
  if (!pool) return;
  await limpiar();
  await pool.end();
});

soloConBase("BLOQUE 7 · la revocación, donde se decide", () => {
  it("EL CONTROL: una clave viva verifica", async () => {
    /**
     * Sin este control, un `WHERE` que no casara nunca pasaría los tres ataques
     * de abajo y dejaría toda la API pública cerrada — que se vería igual de
     * verde y sería una avería completa.
     */
    const raw = claveNueva("viva");
    await insertar(raw);
    const r = await verifyKey(raw);
    expect(r).not.toBeNull();
    expect(r?.tenantId).toBe(TENANT);
  });

  it("una clave REVOCADA no verifica", async () => {
    const raw = claveNueva("revocada");
    await insertar(raw, { revoked_at: new Date().toISOString() });
    expect(await verifyKey(raw), "una clave revocada siguio siendo valida").toBeNull();
  });

  it("revocar una clave YA emitida la corta", async () => {
    /**
     * La prueba que de verdad importa: no basta con que una fila nacida revocada
     * no valga. Lo que promete el botón de revocar es cortar una clave que
     * estaba funcionando hace un segundo.
     */
    const raw = claveNueva("en-uso");
    await insertar(raw);
    expect(await verifyKey(raw)).not.toBeNull(); // funcionaba
    await pool.query(`UPDATE api_keys SET revoked_at = NOW() WHERE name = $1`, [NOMBRE]);
    expect(await verifyKey(raw), "revocar no corto una clave que estaba en uso").toBeNull();
  });

  it("desactivar una clave la corta", async () => {
    const raw = claveNueva("desactivada");
    await insertar(raw);
    await pool.query(`UPDATE api_keys SET active = FALSE WHERE name = $1`, [NOMBRE]);
    expect(await verifyKey(raw), "una clave desactivada siguio siendo valida").toBeNull();
  });

  it("una clave CADUCADA no verifica", async () => {
    const raw = claveNueva("caducada");
    await insertar(raw, { expires_at: new Date(Date.now() - 60_000).toISOString() });
    expect(await verifyKey(raw), "una clave caducada siguio siendo valida").toBeNull();
  });

  it("una clave que no existe no verifica", async () => {
    expect(await verifyKey(claveNueva("inexistente"))).toBeNull();
  });

  it("el identificador que devuelve NO es un trozo de la clave", async () => {
    // La misma propiedad que la suite de la puerta, comprobada contra la fila
    // real: lo que se propaga a los registros es el `id`, no la credencial.
    const raw = claveNueva("identidad");
    await insertar(raw);
    const r = await verifyKey(raw);
    expect(r?.keyId).toBeTruthy();
    expect(raw.includes(String(r?.keyId)), "el identificador es un prefijo de la clave").toBe(false);
  });
});
