/**
 * La supresión de datos de un interesado se completa, o no toca al tercero.
 *
 * EL DEFECTO
 * ----------
 * `deleteUserData` cancelaba la suscripción de Stripe **antes** de borrar nada, y
 * la línea siguiente era:
 *
 *     await this.db.query(`DELETE FROM user_provider_api_keys WHERE user_id = $1`)
 *
 * `user_provider_api_keys` **no existe en producción** —su `CREATE` de la
 * migración 406 no prosperó allí— así que esa línea lanza. Resultado:
 *
 *     la suscripción quedaba cancelada, irreversiblemente y en un tercero,
 *     y los datos del interesado seguían intactos.
 *
 * Es el peor orden posible: la acción externa e irreversible primero, y la
 * interna —la que de verdad pide la ley— después, donde ya no llega.
 *
 * Y la exportación tenía el mismo problema: `db.query` directo sobre esa tabla,
 * así que una petición de acceso no devolvía **nada**.
 *
 * LOS DOS CONTROLES QUE HACEN FALTA
 * ----------------------------------
 * No basta con «no falla». Hay que separar dos cosas que se parecen:
 *
 *   · una tabla que no existe en este entorno   → se omite, con traza
 *   · cualquier otro error                      → se propaga
 *
 * El `catch` vacío original las trataba igual, y por eso un fallo de permisos o
 * una caída de la base durante un borrado se veían como éxito. En una supresión
 * eso significa responder «hecho» al interesado con el dato todavía ahí.
 */
import { describe, expect, it, vi } from "vitest";

type Consulta = { sql: string; params: unknown[] };

/** Error de PostgreSQL con el código que corresponde. */
function errorPg(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

/**
 * Base falsa. Aquí sí es legítimo un doble: lo que se comprueba es el ORDEN de
 * las operaciones y qué se propaga, no que el SQL sea válido —eso lo cubre
 * `test_ninguna_consulta_cita_una_columna_que_no_existe` contra el catálogo real.
 */
function baseFalsa(opciones: {
  faltan?: string[];
  rompe?: { fragmento: string; code: string };
} = {}) {
  const consultas: Consulta[] = [];
  const db = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      consultas.push({ sql, params });
      for (const t of opciones.faltan ?? []) {
        if (sql.includes(t)) throw errorPg("42P01", `relation "${t}" does not exist`);
      }
      if (opciones.rompe && sql.includes(opciones.rompe.fragmento)) {
        throw errorPg(opciones.rompe.code, "boom");
      }
      if (sql.includes("FROM nelvyon_users WHERE user_id")) {
        return [{ email: "a@b.c", full_name: "Ana", tenant_id: "t1" }];
      }
      return [];
    }),
  };
  return { db, consultas };
}

async function servicio(db: unknown) {
  const { DataSubjectService } = await import("../dataSubjectService");
  return new DataSubjectService(db as never);
}

describe("supresión GDPR", () => {
  it("se completa aunque falte `user_provider_api_keys` en este entorno", async () => {
    // LA PRUEBA. Es exactamente el estado de producción hoy.
    const { db, consultas } = baseFalsa({ faltan: ["user_provider_api_keys"] });
    const svc = await servicio(db);
    await svc.deleteUserData("u1");

    const anonimizo = consultas.some((c) => c.sql.includes("UPDATE nelvyon_users SET"));
    expect(anonimizo).toBe(true);
  });

  it("la anonimización ocurre ANTES de tocar Stripe", async () => {
    // El orden es el defecto. Si Stripe va primero y algo falla después, la
    // suscripción queda cancelada y el dato sigue ahí.
    //
    // HACE FALTA la clave: `tryCancelStripeSubscription` sale antes si no hay
    // `STRIPE_SECRET_KEY`, asi que sin ella la consulta nunca aparece.
    //
    // La primera version de esta prueba no la ponia y remataba con
    // `if (iStripe >= 0) expect(...)`. Esa condicion NUNCA se cumplia, asi que
    // la prueba pasaba sin comprobar nada: al mover Stripe de vuelta al
    // principio seguia verde. Una prueba de orden que no mira el orden es peor
    // que ninguna, porque hace creer que el orden esta vigilado.
    const previa = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_para_que_el_camino_se_recorra";
    try {
      const { db, consultas } = baseFalsa();
      const svc = await servicio(db);
      await svc.deleteUserData("u1");

      const iAnon = consultas.findIndex((c) => c.sql.includes("UPDATE nelvyon_users SET"));
      const iStripe = consultas.findIndex((c) => c.sql.includes("stripe_subscription_id"));
      expect(iAnon).toBeGreaterThanOrEqual(0);        // control positivo
      expect(iStripe).toBeGreaterThanOrEqual(0);      // y el camino de Stripe SE RECORRE
      expect(iAnon).toBeLessThan(iStripe);
    } finally {
      if (previa === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = previa;
    }
  });

  it("un error que NO es «objeto ausente» se propaga, no se traga", async () => {
    // EL CONTROL que impide la corrección fácil. Tolerar cualquier error haría
    // que un fallo de permisos o una caída de la base durante un borrado se
    // vieran como éxito: se responde «hecho» al interesado con el dato ahí.
    const { db } = baseFalsa({ rompe: { fragmento: "DELETE FROM saas_api_keys", code: "42501" } });
    const svc = await servicio(db);
    await expect(svc.deleteUserData("u1")).rejects.toThrow();
  });

  it("si el borrado falla, NO se ha cancelado la suscripción", async () => {
    // La consecuencia de haber movido Stripe al final, comprobada.
    const previa = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_para_que_el_camino_se_recorra";
    try {
      const { db, consultas } = baseFalsa({ rompe: { fragmento: "UPDATE nelvyon_users SET", code: "42501" } });
      const svc = await servicio(db);
      await expect(svc.deleteUserData("u1")).rejects.toThrow();
      expect(consultas.some((c) => c.sql.includes("stripe_subscription_id"))).toBe(false);
    } finally {
      if (previa === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = previa;
    }
  });
});

describe("exportación GDPR", () => {
  it("devuelve datos aunque falte `user_provider_api_keys`", async () => {
    const { db } = baseFalsa({ faltan: ["user_provider_api_keys"] });
    const svc = await servicio(db);
    const datos = await svc.exportUserData("u1");
    expect(datos).toBeTruthy();       // antes lanzaba y no se entregaba nada
  });

  it("un error distinto de «objeto ausente» tambien se propaga aqui", async () => {
    const { db } = baseFalsa({ rompe: { fragmento: "user_provider_api_keys", code: "42501" } });
    const svc = await servicio(db);
    await expect(svc.exportUserData("u1")).rejects.toThrow();
  });
});
