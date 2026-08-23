/**
 * Una baja no puede volver a estar activa porque Stripe reintente un evento.
 *
 * EL DEFECTO
 * ----------
 * `updateMemberStatus` asigna el estado a pelo:
 *
 *     UPDATE saas_membership_members SET status=$3, updated_at=NOW()
 *      WHERE tenant_id=$1 AND stripe_subscription_id=$2
 *
 * Y `checkAccess` abre el contenido de pago con `m.status='active'`.
 *
 * Stripe NO garantiza el orden de entrega y reintenta durante dias. Si un
 * `customer.subscription.created` llega —o se reintenta— DESPUES del
 * `customer.subscription.deleted` que ya se proceso, ese UPDATE devuelve la fila
 * a `active`, y con ella el acceso al material de pago de alguien que se dio de
 * baja. No hace falta ningun ataque: basta con que Stripe reintente, que es su
 * comportamiento normal y documentado.
 *
 * La ruta `/api/webhooks/stripe` si lleva registro de eventos
 * (`stripe_webhook_events`, `ON CONFLICT (stripe_event_id)`); la de membresia
 * no llevaba nada.
 *
 * EL ARREGLO
 * ----------
 * La transicion a `active` no se aplica sobre un estado terminal. Reactivar una
 * suscripcion cancelada no llega por `created` —Stripe manda `updated`, que esta
 * ruta no trata—, asi que un `created` sobre una baja es SIEMPRE una entrega
 * fuera de orden, y lo correcto es no aplicarlo.
 *
 * Se salta sin `NELVYON_WEB_CERT_DSN`: se prueba contra PostgreSQL de verdad
 * porque lo que se afirma es una propiedad del UPDATE, no del TypeScript.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN = process.env.NELVYON_WEB_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

const INQUILINO = "11111111-1111-4111-8111-111111111111";
const SUSCRIPCION = "sub_prueba_baja";

/** La forma anterior, para demostrar que la prueba distingue una de otra. */
const COMO_ESTABA = `
  UPDATE cert_membresia SET status=$3, updated_at=NOW()
   WHERE tenant_id=$1 AND stripe_subscription_id=$2`;

/** La forma corregida: `active` no pisa un estado terminal. */
const CORREGIDA = `
  UPDATE cert_membresia SET status=$3, updated_at=NOW()
   WHERE tenant_id=$1 AND stripe_subscription_id=$2
     AND NOT ($3 = 'active' AND status IN ('cancelled', 'expired'))`;

async function estado(): Promise<string> {
  const r = await pool.query<{ status: string }>(
    "SELECT status FROM cert_membresia WHERE stripe_subscription_id=$1", [SUSCRIPCION]);
  return r.rows[0]?.status ?? "(sin fila)";
}

describeSiHayPg("una baja no resucita por un reintento de Stripe", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 2 });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cert_membresia (
        id serial PRIMARY KEY,
        tenant_id uuid NOT NULL,
        stripe_subscription_id text NOT NULL,
        status text NOT NULL,
        updated_at timestamptz DEFAULT now()
      )`);
  });

  afterAll(async () => {
    await pool?.query("DROP TABLE IF EXISTS cert_membresia");
    await pool?.end();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE cert_membresia");
    await pool.query(
      "INSERT INTO cert_membresia (tenant_id, stripe_subscription_id, status) VALUES ($1,$2,'active')",
      [INQUILINO, SUSCRIPCION]);
  });

  it("EL CONTROL DEL DEFECTO: con la forma anterior, la baja SI resucitaba", async () => {
    // Sin esto no habria forma de saber si la prueba distingue las dos formas o
    // simplemente pasa siempre.
    await pool.query(COMO_ESTABA, [INQUILINO, SUSCRIPCION, "cancelled"]);
    await pool.query(COMO_ESTABA, [INQUILINO, SUSCRIPCION, "active"]);
    expect(await estado()).toBe("active");
  });

  it("con la forma corregida, el `created` tardio NO reactiva la baja", async () => {
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "cancelled"]);
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "active"]);
    expect(await estado()).toBe("cancelled");
  });

  it("tampoco reactiva a quien caduco por impago", async () => {
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "expired"]);
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "active"]);
    expect(await estado()).toBe("expired");
  });

  it("EL CONTROL: dar de baja SIGUE funcionando", async () => {
    // Sin esto, un UPDATE que no hiciera nada nunca aprobaria las dos pruebas
    // de arriba — y las bajas dejarian de aplicarse, que es peor que el defecto
    // original: se seguiria dando acceso a quien ya no paga.
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "cancelled"]);
    expect(await estado()).toBe("cancelled");
  });

  it("EL OTRO CONTROL: el alta normal SIGUE activando", async () => {
    await pool.query("UPDATE cert_membresia SET status='pending'");
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "active"]);
    expect(await estado()).toBe("active");
  });

  it("y un impago sobre una activa SIGUE caducandola", async () => {
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "expired"]);
    expect(await estado()).toBe("expired");
  });

  it("el reintento del MISMO evento de baja es inocuo", async () => {
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "cancelled"]);
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "cancelled"]);
    expect(await estado()).toBe("cancelled");
  });

  it("no toca la fila de OTRO inquilino con la misma suscripcion", async () => {
    const otro = "22222222-2222-4222-8222-222222222222";
    await pool.query(
      "INSERT INTO cert_membresia (tenant_id, stripe_subscription_id, status) VALUES ($1,$2,'active')",
      [otro, SUSCRIPCION]);
    await pool.query(CORREGIDA, [INQUILINO, SUSCRIPCION, "cancelled"]);

    const r = await pool.query<{ status: string }>(
      "SELECT status FROM cert_membresia WHERE tenant_id=$1", [otro]);
    expect(r.rows[0]?.status).toBe("active");
  });
});
