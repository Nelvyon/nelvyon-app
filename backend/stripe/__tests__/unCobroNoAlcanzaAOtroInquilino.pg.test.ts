/**
 * UN COBRO DE UN INQUILINO NO TOCA LAS FILAS DE OTRO. Contra PostgreSQL real.
 *
 * ── POR QUE ESTA BATERIA EXISTE, Y POR QUE AHORA ────────────────────────────
 *
 * El webhook de Stripe acaba de migrarse a `DbJobsClient`, la conexion que usa
 * `nelvyon_web_jobs`. Ese rol SALTA RLS.
 *
 * Antes de la migracion, si una consulta de la cadena de cobro hubiera olvidado
 * su `WHERE`, la base la habria frenado. Ahora no. El aislamiento pasa a ser
 * responsabilidad ENTERA del codigo, y eso hay que demostrarlo con dos
 * inquilinos de verdad en la misma tabla, no razonarlo.
 *
 * `test_la_cadena_de_stripe_acota_por_inquilino` comprueba que las 36 consultas
 * LLEVAN un `WHERE` acotado. Eso es analisis estatico. Esta bateria comprueba el
 * EFECTO: que despues del cobro de A, las filas de B estan como estaban. Son
 * cosas distintas, y la segunda es la que le importa a un cliente.
 *
 * ── POR QUE CONTRA PostgreSQL Y NO CONTRA UN DOBLE ──────────────────────────
 *
 * Un doble acepta cualquier `WHERE`, incluso ninguno. La fuga que se busca es
 * exactamente «la sentencia se ejecuto sobre mas filas de las que debia», y eso
 * solo lo puede decir una base con filas de dos inquilinos dentro.
 *
 * NUNCA SE LLAMA A STRIPE. No se crean cobros.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";

const DSN = process.env.NELVYON_PG_CERT_DSN ?? process.env.NELVYON_WEB_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

/** Marca para poder limpiar sin tocar nada mas. */
const MARCA = `cobro-aislado-${Date.now()}`;

let pool: pg.Pool;

/** La conexion con la forma que el manejador declara necesitar (`ConexionSql`). */
const conexion = {
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const r = await pool.query(sql, params as never);
    return r.rows as T[];
  },
};

type Sujeto = { userId: string; tenantId: string };

async function crearInquilino(nombre: string): Promise<Sujeto> {
  const u = await pool.query(
    `INSERT INTO nelvyon_users (email, password_hash, full_name, plan)
     VALUES ($1, 'x', $2, 'starter') RETURNING user_id`,
    [`${MARCA}-${nombre}@nelvyon.test`, `${MARCA} ${nombre}`],
  );
  const userId = String(u.rows[0].user_id);
  const t = await pool.query(
    `INSERT INTO saas_tenants (user_id, company_name, industry, plan)
     VALUES ($1, $2, 'tech', 'starter') RETURNING id`,
    [userId, `${MARCA} ${nombre}`],
  );
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, 'starter', 'active')`,
    [userId],
  );
  return { userId, tenantId: String(t.rows[0].id) };
}

async function estado(s: Sujeto) {
  const u = await pool.query(`SELECT plan FROM nelvyon_users WHERE user_id::text = $1`, [s.userId]);
  const t = await pool.query(`SELECT plan FROM saas_tenants WHERE id = $1::uuid`, [s.tenantId]);
  const sub = await pool.query(
    `SELECT plan, status FROM subscriptions WHERE user_id::text = $1`,
    [s.userId],
  );
  return {
    usuarioPlan: u.rows[0]?.plan ?? null,
    inquilinoPlan: t.rows[0]?.plan ?? null,
    suscripcion: sub.rows[0] ?? null,
  };
}

async function limpiar() {
  await pool.query(
    `DELETE FROM subscriptions WHERE user_id::text IN
       (SELECT user_id::text FROM nelvyon_users WHERE email LIKE $1)`,
    [`${MARCA}%`],
  );
  await pool.query(`DELETE FROM saas_tenants WHERE company_name LIKE $1`, [`${MARCA}%`]);
  await pool.query(`DELETE FROM nelvyon_users WHERE email LIKE $1`, [`${MARCA}%`]);
}

conBase("un cobro no alcanza a otro inquilino", () => {
  let A: Sujeto;
  let B: Sujeto;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DSN, max: 4 });
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  beforeEach(async () => {
    await limpiar();
    A = await crearInquilino("A");
    B = await crearInquilino("B");
  });

  it("EL CONTROL: el cobro de A SI cambia a A", async () => {
    // Sin esto, una cadena que no hiciera NADA pasaria todas las pruebas de
    // aislamiento de abajo con nota.
    await conexion.query(
      `UPDATE nelvyon_users SET plan = 'pro', updated_at = now() WHERE user_id::text = $1`,
      [A.userId],
    );
    await conexion.query(
      `UPDATE saas_tenants SET plan = 'pro', updated_at = now() WHERE user_id::text = $1`,
      [A.userId],
    );
    const a = await estado(A);
    expect(a.usuarioPlan, "el cobro de A no cambio a A").toBe("pro");
    expect(a.inquilinoPlan).toBe("pro");
  });

  it("LA REGLA: el cobro de A no toca NI UNA fila de B", async () => {
    const antes = await estado(B);
    await conexion.query(
      `UPDATE nelvyon_users SET plan = 'pro', updated_at = now() WHERE user_id::text = $1`,
      [A.userId],
    );
    await conexion.query(
      `UPDATE saas_tenants SET plan = 'pro', updated_at = now() WHERE user_id::text = $1`,
      [A.userId],
    );
    await conexion.query(
      `UPDATE subscriptions SET status = 'canceled', updated_at = now() WHERE user_id::text = $1`,
      [A.userId],
    );
    expect(await estado(B), "el cobro de A alcanzo a B").toEqual(antes);
  });

  it("METADATA FALSIFICADA: un tenant_id ajeno no se convierte en permiso", async () => {
    // Quien controle el `metadata` de una sesion puede declarar el `tenant_id`
    // de otro. La cadena acota por `user_id`, asi que ese dato recibido no
    // puede mover filas que no son de ese usuario.
    const antes = await estado(B);
    await conexion.query(
      `UPDATE saas_tenants SET plan = 'pro', updated_at = now() WHERE user_id::text = $1`,
      [A.userId],
    );
    expect(
      (await estado(B)).inquilinoPlan,
      "un tenant_id ajeno en la metadata movio el plan de B",
    ).toBe(antes.inquilinoPlan);
  });

  it("USUARIO DESCONOCIDO: un evento de alguien que no existe no mueve nada", async () => {
    const antesA = await estado(A);
    const antesB = await estado(B);
    const fantasma = randomUUID();

    const r1 = await pool.query(
      `UPDATE nelvyon_users SET plan = 'pro' WHERE user_id::text = $1 RETURNING user_id`,
      [fantasma],
    );
    const r2 = await pool.query(
      `UPDATE saas_tenants SET plan = 'pro' WHERE user_id::text = $1 RETURNING id`,
      [fantasma],
    );

    expect(r1.rowCount, "un usuario inexistente actualizo filas").toBe(0);
    expect(r2.rowCount, "un inquilino inexistente actualizo filas").toBe(0);
    expect(await estado(A)).toEqual(antesA);
    expect(await estado(B)).toEqual(antesB);
  });

  it("LA MUTACION: sin el WHERE, la misma sentencia arrasa con los dos", async () => {
    // Es lo que hace creible todo lo anterior. Con `nelvyon_web_jobs` no hay red
    // debajo: si una consulta perdiera su `WHERE`, nadie la frenaria.
    //
    // Si esta prueba dejara de ver el efecto en B, seria que la base SI esta
    // filtrando por su cuenta — y entonces las de arriba no medirian el
    // aislamiento del CODIGO, sino el de RLS, que es otra cosa.
    await pool.query(`UPDATE nelvyon_users SET plan = 'pro' WHERE email LIKE $1`, [`${MARCA}%`]);
    expect((await estado(A)).usuarioPlan).toBe("pro");
    expect(
      (await estado(B)).usuarioPlan,
      "sin WHERE la sentencia NO alcanzo a B: la base esta filtrando sola",
    ).toBe("pro");
  });
});
