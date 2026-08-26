/**
 * BLOQUE 7 · ser administrador lo dice la base... si la base tuviera dónde.
 *
 * `requirePlatformAdmin` hace dos cosas y solo la segunda es autorización:
 * `requirePlatformClaims` comprueba que haya sesión —su propia documentación
 * avisa de que es «AUTENTICACIÓN, no autorización»— y después
 * `isUserAdmin(claims.userId)` va a PostgreSQL a preguntar el rol.
 *
 * Ir a la base en vez de mirar el `role` del token es la decisión correcta: el
 * token va firmado, sí, pero lo firmó NELVYON hace hasta ocho horas, y si a
 * alguien se le quita el rol su token sigue diciendo lo de antes.
 *
 * PERO: `isUserAdmin` consulta `os_users.role` y, si falla, `nelvyon_users.role`.
 * **Ninguna de las dos existe.** No hay migración en el árbol que cree la tabla
 * `os_users` ni que añada una columna `role` a `nelvyon_users`. Las dos
 * consultas lanzan, los dos `catch` devuelven `false`, y el resultado es que
 * **nadie puede ser administrador de plataforma**.
 *
 * Eso cierra en falso, que es la dirección buena. Pero tiene dos consecuencias
 * que hay que decir en voz alta:
 *
 *   1. Todas las rutas `admin/*` y todas las que llaman a `requirePlatformAdmin`
 *      responden 403 a cualquiera. Es una superficie de producto muerta.
 *   2. Un esquema que falta se traga en un `catch` y se informa como «no es
 *      administrador»: indistinguible de una denegación legítima. Es el mismo
 *      defecto de diagnóstico que la puerta de sesión con `DATABASE_URL`, y ahí
 *      lo destaparon los controles positivos. Aquí también.
 *
 * Lo que esta suite hace es fijar el comportamiento REAL —cierra en falso y no
 * revienta— y certificar aparte que la comparación de roles es exacta, para que
 * el día que alguien decida quién es administrador y añada el esquema, esa mitad
 * ya esté probada. Quién es administrador de plataforma es una decisión de
 * producto y no se toma aquí.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

const USUARIO = "66666666-6666-4666-8666-666666666666";
const CORREO = "admin-cert-b7@ejemplo.test";

let pool: import("pg").Pool;

async function limpiar(): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id = $1`, [USUARIO]);
}

beforeAll(async () => {
  if (!hayBase) return;
  process.env.DATABASE_URL = DSN;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });
  await limpiar();
  await pool.query(
    `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
     VALUES ($1,$2,'x','Usuario Cert','pro')`,
    [USUARIO, CORREO],
  );
});

afterAll(async () => {
  if (!pool) return;
  await limpiar();
  await pool.end();
});

soloConBase("BLOQUE 7 · el estado REAL del rol de administrador", () => {
  it("el esquema que `isUserAdmin` consulta NO existe", async () => {
    /**
     * Se comprueba contra el catálogo de PostgreSQL, no de memoria. Si algún día
     * alguien añade el esquema, esta prueba se pondrá roja y obligará a revisar
     * las de abajo — que es exactamente lo que debe pasar.
     */
    const r = await pool.query<{ os: string | null; rol: string | null }>(
      `SELECT to_regclass('public.os_users')::text AS os,
              (SELECT column_name FROM information_schema.columns
                WHERE table_name = 'nelvyon_users' AND column_name = 'role') AS rol`,
    );
    expect(
      r.rows[0]?.os,
      "`os_users` existe ahora: revisa si `isUserAdmin` ya puede conceder acceso",
    ).toBeNull();
    expect(
      r.rows[0]?.rol,
      "`nelvyon_users.role` existe ahora: revisa si `isUserAdmin` ya puede conceder acceso",
    ).toBeNull();
  });

  it("con ese esquema, NADIE es administrador — y cierra en falso, no revienta", async () => {
    const { getNelvyonAdminService } = await import("../NelvyonAdminService");
    const svc = getNelvyonAdminService();
    // Un usuario que existe de verdad en la tabla.
    await expect(svc.isUserAdmin(USUARIO)).resolves.toBe(false);
    // Y uno que no.
    await expect(svc.isUserAdmin("88888888-8888-4888-8888-888888888888")).resolves.toBe(false);
    // Y basura, que tampoco puede reventar la ruta que la llama.
    await expect(svc.isUserAdmin("no-es-un-uuid")).resolves.toBe(false);
    await expect(svc.isUserAdmin("")).resolves.toBe(false);
  });
});

describe("BLOQUE 7 · la comparación del rol, certificada para cuando exista", () => {
  /**
   * Con un doble de la base, porque lo que se mide aquí NO es la consulta —esa
   * se mide arriba, contra PostgreSQL— sino la comparación que decide. Se deja
   * probada por adelantado: el día que alguien añada la columna, la mitad
   * peligrosa ya está cubierta.
   */
  async function conRol(role: unknown): Promise<boolean> {
    vi.resetModules();
    vi.doMock("../../db/DbClient", () => ({
      DbClient: {
        getInstance: () => ({
          query: async (sql: string) =>
            sql.includes("nelvyon_users") ? [{ role }] : Promise.reject(new Error("no existe")),
        }),
      },
    }));
    const { getNelvyonAdminService, resetNelvyonAdminServiceForTests } = (await import(
      "../NelvyonAdminService"
    )) as typeof import("../NelvyonAdminService") & {
      resetNelvyonAdminServiceForTests?: () => void;
    };
    resetNelvyonAdminServiceForTests?.();
    return getNelvyonAdminService().isUserAdmin("u-1");
  }

  it("EL CONTROL: `admin` concede", async () => {
    expect(await conRol("admin")).toBe(true);
  });

  it("las mayúsculas no importan", async () => {
    for (const r of ["ADMIN", "Admin", "aDmIn"]) {
      expect(await conRol(r), r).toBe(true);
    }
  });

  it("un rol PARECIDO no cuela", async () => {
    /**
     * `administrator`, `admin_readonly`, `superadmin`, `admin ` con un espacio:
     * si la comparación fuera por prefijo o por `includes`, cualquiera de estos
     * daría acceso completo al panel de plataforma.
     */
    for (const r of ["administrator", "admin_readonly", "superadmin", " admin", "admin ", "adm", ""]) {
      expect(await conRol(r), `el rol ${JSON.stringify(r)} dio administrador`).toBe(false);
    }
  });

  it("un rol que no es texto no concede", async () => {
    for (const r of [null, undefined, 1, true, {}, ["admin"]]) {
      expect(await conRol(r), JSON.stringify(r)).toBe(false);
    }
  });
});
