/**
 * Quien caduca por un impago y vuelve a pagar, vuelve a entrar.
 *
 * DE DÓNDE VIENE ESTO
 * ===================
 * `STRIPE_MEMBERSHIP_REACTIVATION` estaba bloqueado con este diagnóstico del
 * Bloque 1: «el único evento que lleva a `active` es
 * `customer.subscription.created`, así que quien caduca por impago no vuelve
 * nunca aunque pague». Y con esta cautela, que era la correcta: **no usar el
 * comportamiento accidental anterior como recuperación**, porque dependía de que
 * Stripe entregara desordenado y ése era justamente el agujero.
 *
 * Al reconstruir el contrato aparecieron DOS cosas, y la segunda no se había
 * visto.
 *
 * 1 · LA REACTIVACIÓN, QUE ERA LO QUE SE BUSCABA
 * -----------------------------------------------
 * El evento que significa «acaba de entrar dinero» es
 * `invoice.payment_succeeded`. Reactivar con él no es fiarse del orden de
 * entrega —el defecto que se cerró— sino del cobro, que es lo que decide si
 * alguien tiene derecho a entrar.
 *
 * 2 · EL IDENTIFICADOR EQUIVOCADO, QUE NADIE BUSCABA
 * ---------------------------------------------------
 * `event.data.object` es una Suscripción en `customer.subscription.*` y una
 * **Factura** en `invoice.*`. La ruta leía `obj.id` para todos por igual, así
 * que `invoice.payment_failed` buscaba un miembro con
 * `stripe_subscription_id = 'in_…'`. No coincidía nunca.
 *
 * Es decir: **la caducidad por impago no caducaba a nadie**, y no fallaba al
 * hacerlo. El `UPDATE` tocaba cero filas y la ruta devolvía `200 OK`. Un
 * moroso conservaba el acceso indefinidamente.
 *
 * Los dos defectos se tapaban entre sí: como nadie caducaba, nadie notaba que
 * los caducados no volvían.
 *
 * SIN TOCAR STRIPE
 * ================
 * Cero llamadas externas. Los eventos se construyen aquí y se pasan al servicio
 * directamente; la verificación de firma tiene su propia suite y no se repite.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasMembershipService } from "../SaasMembershipService";
import { suscripcionDelEvento } from "../../../apps/web/src/app/api/webhooks/stripe-membership/route";

const DSN = process.env.NELVYON_B2_DSN ?? process.env.NELVYON_PG_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "5711aaaa-bbbb-4ccc-8ddd-eeeeeeee0001";
const USUARIO = "5711aaaa-bbbb-4ccc-8ddd-eeeeeeee00f1";
const SUB = "sub_cert_reactivacion_001";
const CORREO = "socio-cert@ejemplo.test";

let pool: import("pg").Pool;
let svc: SaasMembershipService;
let planId = "";

/**
 * Un puerto atado al pool DE ESTE FICHERO, no al singleton `DbClient`.
 *
 * Vitest reparte varios ficheros por *worker* y comparte el proceso. Si aquí se
 * usara `DbClient.getInstance()`, se cogería el singleton que otro fichero del
 * mismo worker ya hubiera construido —apuntando a OTRA base—, y este fichero
 * sembraría en una y consultaría en la otra.
 *
 * Aislado pasaba y en la suite completa fallaba: el peor tipo de rojo, porque
 * parece intermitente cuando en realidad es determinista y depende del reparto.
 */
function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

async function estado(): Promise<string | null> {
  const r = await pool.query<{ status: string }>(
    `SELECT status FROM saas_membership_members
      WHERE tenant_id=$1 AND stripe_subscription_id=$2`,
    [TENANT, SUB],
  );
  return r.rows[0]?.status ?? null;
}

async function ponerEstado(s: string): Promise<void> {
  await pool.query(
    `UPDATE saas_membership_members SET status=$3, updated_at=NOW()
      WHERE tenant_id=$1 AND stripe_subscription_id=$2`,
    [TENANT, SUB, s],
  );
}

beforeAll(async () => {
  if (!DSN) return;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });
  await pool.query(`DELETE FROM saas_membership_members WHERE tenant_id=$1`, [TENANT]);
  await pool.query(`DELETE FROM saas_membership_plans WHERE tenant_id=$1`, [TENANT]);
  await pool.query(`DELETE FROM saas_tenants WHERE id=$1`, [TENANT]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id=$1`, [USUARIO]);
  await pool.query(
    `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
     VALUES ($1,'membresia-cert@ejemplo.test','x','Cert','pro')`,
    [USUARIO],
  );
  await pool.query(
    `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
     VALUES ($1,$2,'Cert Membresia','tech','pro')`,
    [TENANT, USUARIO],
  );
  const p = await pool.query<{ id: string }>(
    `INSERT INTO saas_membership_plans
       (tenant_id, name, slug, price_amount, price_currency, billing_interval, is_active)
     VALUES ($1,'Plan Cert','plan-cert-reactivacion',10,'EUR','month',true) RETURNING id::text`,
    [TENANT],
  );
  planId = p.rows[0]!.id;

  svc = new SaasMembershipService(puerto() as never);
});

beforeEach(async () => {
  if (!pool) return;
  await pool.query(`DELETE FROM saas_membership_members WHERE tenant_id=$1`, [TENANT]);
  await pool.query(
    `INSERT INTO saas_membership_members
       (tenant_id, plan_id, contact_email, stripe_subscription_id, status)
     VALUES ($1,$2,$3,$4,'active')`,
    [TENANT, planId, CORREO, SUB],
  );
});

afterAll(async () => {
  if (!pool) return;
  await pool.query(`DELETE FROM saas_membership_members WHERE tenant_id=$1`, [TENANT]);
  await pool.query(`DELETE FROM saas_membership_plans WHERE tenant_id=$1`, [TENANT]);
  await pool.query(`DELETE FROM saas_tenants WHERE id=$1`, [TENANT]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id=$1`, [USUARIO]);
  await pool.end();
});

describe("de qué objeto sale la suscripción", () => {
  it("de una SUSCRIPCIÓN, el propio `id`", () => {
    expect(suscripcionDelEvento("customer.subscription.created", { id: "sub_1" })).toBe("sub_1");
    expect(suscripcionDelEvento("customer.subscription.deleted", { id: "sub_2" })).toBe("sub_2");
  });

  it("de una FACTURA, el campo `subscription` — NO su `id`", () => {
    /**
     * El defecto entero, en una línea. Si esto devolviera `in_…`, ningún
     * miembro coincidiría y la caducidad por impago no caducaría a nadie.
     */
    const factura = { id: "in_999", subscription: "sub_3" };
    expect(suscripcionDelEvento("invoice.payment_failed", factura)).toBe("sub_3");
    expect(suscripcionDelEvento("invoice.payment_succeeded", factura)).toBe("sub_3");
    expect(
      suscripcionDelEvento("invoice.payment_failed", factura),
      "se devolvió el id de la FACTURA",
    ).not.toBe("in_999");
  });

  it("también con la forma nueva de la API, donde va anidado", () => {
    // Cuál de las dos llega depende de la versión de API configurada en Stripe,
    // y eso no se decide desde el código.
    const nueva = {
      id: "in_888",
      parent: { subscription_details: { subscription: "sub_4" } },
    };
    expect(suscripcionDelEvento("invoice.payment_succeeded", nueva)).toBe("sub_4");
  });

  it("si no hay suscripción, cadena vacía — y no un id cualquiera", () => {
    // Devolver algo aquí sería peor que no devolver nada: buscaría un miembro
    // por un identificador que no es de nadie.
    expect(suscripcionDelEvento("invoice.payment_succeeded", { id: "in_1" })).toBe("");
    expect(suscripcionDelEvento("customer.subscription.created", {})).toBe("");
  });
});

conBase("la reactivación por pago (PostgreSQL real)", () => {
  it("EL CONTROL: la siembra deja al socio activo", async () => {
    // Sin esto, «se reactivó» podría estar leyendo un `active` que nunca se fue.
    expect(await estado()).toBe("active");
  });

  it("caducado por impago + pago -> ACTIVO", async () => {
    await ponerEstado("expired");
    expect(await estado()).toBe("expired");

    const reactivado = await svc.reactivarPorPago(TENANT, SUB);
    expect(reactivado, "el pago no reactivó a un caducado").toBe(true);
    expect(await estado()).toBe("active");
  });

  it("dado de BAJA + pago -> sigue de baja", async () => {
    /**
     * La única decisión de producto que queda, escrita en la dirección que
     * cierra: una baja explícita no la deshace un cobro rezagado.
     */
    await ponerEstado("cancelled");
    const reactivado = await svc.reactivarPorPago(TENANT, SUB);
    expect(reactivado, "un pago resucitó una baja explícita").toBe(false);
    expect(await estado()).toBe("cancelled");
  });

  it("repetir el pago no cambia nada: es idempotente", async () => {
    await ponerEstado("expired");
    expect(await svc.reactivarPorPago(TENANT, SUB)).toBe(true);
    // La segunda ya no encuentra nada que levantar, y eso es correcto.
    expect(await svc.reactivarPorPago(TENANT, SUB)).toBe(false);
    expect(await estado()).toBe("active");
  });

  it("un pago de OTRO inquilino no toca a éste", async () => {
    await ponerEstado("expired");
    const otro = "5711aaaa-bbbb-4ccc-8ddd-eeeeeeee9999";
    expect(await svc.reactivarPorPago(otro, SUB)).toBe(false);
    expect(await estado(), "se reactivó desde otro inquilino").toBe("expired");
  });

  it("un pago de OTRA suscripción no toca a ésta", async () => {
    await ponerEstado("expired");
    expect(await svc.reactivarPorPago(TENANT, "sub_de_otro")).toBe(false);
    expect(await estado()).toBe("expired");
  });
});

conBase("lo que ya estaba protegido sigue protegido", () => {
  it("un `created` reentregado NO resucita una baja", async () => {
    /**
     * El agujero original del Bloque 1, que no se recupera. Stripe reintenta
     * durante días y no garantiza el orden: un `created` que llega después del
     * `deleted` no es noticia de nada.
     */
    await ponerEstado("cancelled");
    await svc.updateMemberStatus(TENANT, SUB, "active");
    expect(await estado(), "un `created` fuera de orden resucitó una baja").toBe("cancelled");
  });

  it("un `created` reentregado tampoco resucita un caducado", async () => {
    // Levantar un caducado es competencia del PAGO, no de un evento viejo.
    await ponerEstado("expired");
    await svc.updateMemberStatus(TENANT, SUB, "active");
    expect(await estado()).toBe("expired");
  });
});

conBase("el inquilino se resuelve aunque la factura no lo traiga", () => {
  it("se encuentra por la suscripción", async () => {
    /**
     * Las facturas no llevan `metadata.tenant_id` —la metadata vive en la
     * suscripción—, así que exigirlo descartaba el evento entero antes de
     * llegar al servicio.
     */
    expect(await svc.inquilinoDeLaSuscripcion(SUB)).toBe(TENANT);
  });

  it("una suscripción desconocida devuelve `null`, no un inquilino cualquiera", async () => {
    expect(await svc.inquilinoDeLaSuscripcion("sub_que_no_existe")).toBeNull();
    expect(await svc.inquilinoDeLaSuscripcion("")).toBeNull();
  });
});
