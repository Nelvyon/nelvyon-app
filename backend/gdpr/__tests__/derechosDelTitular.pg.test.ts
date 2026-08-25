/**
 * BLOQUE 4 · derechos del titular, contra PostgreSQL real.
 *
 * Dos afirmaciones que NELVYON hace a una persona y que tienen consecuencias
 * legales si son falsas:
 *
 *   - **«Aquí están todos tus datos.»** Si falta la mitad, la exportación no
 *     cumple.
 *   - **«Tus datos se han borrado.»** Si un `DELETE` falló y el error se tragó,
 *     NELVYON acaba de mentir sobre algo que un regulador puede comprobar.
 *
 * Y una de orden: la cancelación en Stripe es **irreversible y está en un
 * tercero**. Si ocurriera antes del borrado y el borrado fallara, la persona se
 * quedaría sin suscripción y con sus datos dentro. Por eso va la última.
 *
 * Se salta sin `NELVYON_B4_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN = process.env.NELVYON_B4_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaae01";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbe01";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

async function sembrarUsuario(id: string, nombre: string) {
  await pool.query(
    `INSERT INTO nelvyon_users
       (user_id, email, password_hash, full_name, plan, tenant_id,
        created_at, updated_at, email_verified)
     VALUES ($1::uuid, $2, 'x', $3, 'pro', $1::text, NOW(), NOW(), true)
     ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
    [id, `titular-${id}@nelvyon.test`, nombre],
  );
  await pool.query(
    `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
     VALUES ($1, $1, $2, 'certificacion', 'pro')
     ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
    [id, nombre],
  );
}

describeSiHayPg("BLOQUE 4 · derechos del titular", () => {
  let svc: import("../dataSubjectService").DataSubjectService;

  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    const { DataSubjectService } = await import("../dataSubjectService");
    svc = new DataSubjectService(puerto() as never);
  });

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM onboarding WHERE user_id = ANY($1::text[])", [[A, B]]).catch(() => {});
    await sembrarUsuario(A, "Titular A");
    await sembrarUsuario(B, "Titular B");
  });

  // -- exportación ----------------------------------------------------------

  it("EL CONTROL: la exportación devuelve datos de verdad", async () => {
    // Sin esto, una exportación que devolviera un objeto vacío pasaría las
    // pruebas de aislamiento de abajo sin exportar nada.
    const e = await svc.exportUserData(A);
    expect(e.exportedAt).toBeTruthy();
    expect(JSON.stringify(e)).toContain("Titular A");
  });

  it("la exportación de A NO contiene datos de B", async () => {
    // Entregar a una persona los datos de otra en respuesta a una solicitud
    // legal es exactamente lo contrario de cumplir.
    const e = await svc.exportUserData(A);
    expect(JSON.stringify(e)).not.toContain("Titular B");
    expect(JSON.stringify(e)).not.toContain(`titular-${B}@nelvyon.test`);
  });

  it("un usuario que no existe no obtiene una exportación inventada", async () => {
    const e = await svc.exportUserData("00000000-0000-4000-8000-000000000000");
    expect(JSON.stringify(e)).not.toContain("Titular A");
    expect(JSON.stringify(e)).not.toContain("Titular B");
  });

  it("la ventana de espera entre exportaciones se aplica", async () => {
    // Sin límite, la exportación es un canal de extracción masiva de datos
    // disponible para cualquiera con una sesión.
    await svc.markExportRequested(A);
    await expect(svc.assertExportAllowed(A)).rejects.toThrow(/COOLDOWN/i);
  });

  it("EL CONTROL: sin exportación previa, sí se permite", async () => {
    // La otra mitad: si rechazara siempre, nadie podría ejercer su derecho.
    await pool.query("UPDATE nelvyon_users SET data_export_requested_at = NULL WHERE user_id = $1::uuid", [A]);
    await expect(svc.assertExportAllowed(A)).resolves.toBeUndefined();
  });

  it("la ventana de A no bloquea la de B", async () => {
    await svc.markExportRequested(A);
    await pool.query("UPDATE nelvyon_users SET data_export_requested_at = NULL WHERE user_id = $1::uuid", [B]);
    await expect(svc.assertExportAllowed(B)).resolves.toBeUndefined();
  });

  // -- errores que NO pueden convertirse en éxito ---------------------------

  it("un error REAL de base se propaga, no se convierte en éxito", async () => {
    // El riesgo de un borrado GDPR: si un DELETE falla y el error se traga,
    // NELVYON informa «borrado» sobre datos que siguen ahí. Un regulador puede
    // comprobarlo.
    //
    // `tryExec` silencia solo «objeto ausente» -tablas que no existen en este
    // entorno- y relanza todo lo demás. Esta prueba fija esa distinción.
    const { DataSubjectService } = await import("../dataSubjectService");
    const roto = new DataSubjectService({
      query: async (sql: string) => {
        // `deleteUserData` sale antes si no encuentra al usuario -borrar a quien
        // no existe es correctamente un no-op-, asi que el doble tiene que
        // devolverlo o la prueba mediria la salida temprana.
        if (/SELECT email, full_name, tenant_id/i.test(sql)) {
          return [{ email: "x@y.test", full_name: "Titular", tenant_id: A }];
        }
        // Se rompe UNA sentencia concreta, la primera que pasa por `tryExec`.
        //
        // La version anterior rompia cualquier DELETE/UPDATE, y eso hacia que la
        // prueba pasara aunque `tryExec` se tragara el error: la siguiente
        // sentencia va por `tryQuery`, que lo relanzaba igual. El negativo
        // pasaba por un camino distinto del que decia medir -exactamente el
        // mismo fallo que aparecio en la suite de OAuth-. Se comprobo mutando
        // solo `tryExec`: la prueba seguia verde.
        if (/DELETE FROM user_provider_api_keys/i.test(sql)) {
          const e = new Error("deadlock detected") as Error & { code: string };
          e.code = "40P01";
          throw e;
        }
        return [];
      },
    } as never);

    await expect(roto.deleteUserData(A)).rejects.toThrow(/deadlock/i);
  });

  it("un objeto ausente NO tumba el borrado (entornos parciales)", async () => {
    // La otra cara: una tabla que no existe en este entorno no puede impedir
    // que se borre todo lo demás. Es la razón de que el catch exista.
    const { DataSubjectService } = await import("../dataSubjectService");
    let tocadas = 0;
    const parcial = new DataSubjectService({
      query: async (sql: string) => {
        if (/SELECT email, full_name, tenant_id/i.test(sql)) {
          return [{ email: "x@y.test", full_name: "Titular", tenant_id: A }];
        }
        if (/DELETE FROM onboarding/i.test(sql)) {
          const e = new Error('relation "onboarding" does not exist') as Error & { code: string };
          e.code = "42P01";
          throw e;
        }
        if (/DELETE|UPDATE/i.test(sql)) tocadas++;
        return [];
      },
    } as never);

    await expect(parcial.deleteUserData(A)).resolves.not.toThrow();
    expect(tocadas, "no siguio borrando tras el objeto ausente").toBeGreaterThan(0);
  });

  // -- orden de lo irreversible ---------------------------------------------

  it("la cancelación en Stripe ocurre DESPUÉS del trabajo interno", async () => {
    // Es irreversible y está en un tercero. Si fuera antes y el borrado fallara,
    // la persona se quedaría sin suscripción y con sus datos dentro: lo peor de
    // las dos posibilidades.
    //
    // Se comprueba sobre el código porque el orden es la propiedad, y ejecutar
    // la cancelación real está prohibido en certificación.
    const { readFileSync, existsSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    let d = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (existsSync(join(d, "apps", "web", "vitest.config.ts"))) break;
      d = dirname(d);
    }
    const texto = readFileSync(join(d, "backend", "gdpr", "dataSubjectService.ts"), "utf8");

    const posDelete = texto.indexOf("DELETE FROM user_provider_api_keys");
    const posStripe = texto.indexOf("cancelSubscriptionImmediately(sid)");
    expect(posDelete).toBeGreaterThan(0);
    expect(posStripe).toBeGreaterThan(0);
    expect(posStripe, "la cancelacion irreversible va ANTES del borrado").toBeGreaterThan(posDelete);
  });

  it("el borrado de A no toca a B", async () => {
    await svc.deleteUserData(A);

    const quedaB = await pool.query<{ n: string }>(
      "SELECT COUNT(*)::text AS n FROM nelvyon_users WHERE user_id = $1::uuid",
      [B],
    );
    expect(Number(quedaB.rows[0]!.n), "el borrado de A alcanzo a B").toBe(1);
  });
});
