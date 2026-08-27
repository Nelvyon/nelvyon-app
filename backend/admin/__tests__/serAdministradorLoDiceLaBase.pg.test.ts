/**
 * Ser administrador lo dice la base — y ahora la base tiene dónde.
 *
 * HISTORIA DE ESTA SUITE, PORQUE EXPLICA LO QUE CERTIFICA
 * =======================================================
 * El Bloque 7 encontró que `isUserAdmin` consultaba `os_users.role` y
 * `nelvyon_users.role`, que **no existen**: las dos consultas lanzaban, los dos
 * `catch` devolvían `false`, y por tanto nadie podía ser administrador y toda la
 * superficie `admin/*` respondía 403. Se dejó cerrado en falso —la dirección
 * correcta— y marcado como decisión de producto.
 *
 * Al reevaluar el bloqueo se buscó lo que entonces no se había buscado: si ya
 * existía una fuente canónica de roles de plataforma. **Existía**: `user_roles`,
 * creada por la migración 545, con su modelo, su API de gestión con jerarquía y
 * auditoría (`backend/routers/rbac_management.py`) y seis sitios del lado Python
 * decidiendo con el mismo predicado `role in ("admin","super_admin")`.
 *
 * Así que no era una decisión de producto: era este lado sin conectar al sistema
 * que ya había. Conectarlo no inventa política, la unifica.
 *
 * LO QUE ESTA SUITE CERTIFICA
 * ---------------------------
 *   1. El mecanismo funciona: una fila `admin` en `user_roles` concede.
 *   2. El cierre en falso se conserva: sin fila, con `is_active=false`, con un
 *      rol de menos nivel o sin la tabla, se deniega.
 *   3. La comparación es exacta: ningún rol parecido cuela.
 *
 * Y hay una suite hermana —`nadieSeHaceAdministradorSolo.pg.test.ts`— para lo
 * que de verdad da miedo: que exista algún CAMINO para autoconcederse el rol.
 * Aquí se mide la decisión; allí, quién puede escribir el dato.
 *
 * LO QUE SIGUE SIENDO DEL FUNDADOR
 * --------------------------------
 * QUIÉN. La primera fila `admin` de `user_roles` es un dato sobre una persona
 * real. Mientras no exista, esto devuelve `false` para todo el mundo.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

const USUARIO = "66666666-6666-4666-8666-666666666666";
const OTRO = "77777777-7777-4777-8777-777777777777";
const CORREO = "admin-cert@ejemplo.test";

let pool: import("pg").Pool;

async function limpiar(): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM user_roles WHERE user_id = ANY($1)`, [[USUARIO, OTRO]]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id = ANY($1::uuid[])`, [[USUARIO, OTRO]]);
}

/** Da de alta un rol de plataforma como lo haría `/rbac/assign`. */
async function asignar(userId: string, role: string, activo: boolean | null = true): Promise<void> {
  await pool.query(
    `INSERT INTO user_roles (user_id, email, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, now(), now())`,
    [userId, CORREO, role, activo],
  );
}

async function esAdmin(userId: string): Promise<boolean> {
  vi.resetModules();
  process.env.DATABASE_URL = DSN;
  const { getNelvyonAdminService } = await import("../NelvyonAdminService");
  return getNelvyonAdminService().isUserAdmin(userId);
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

beforeEach(async () => {
  if (!pool) return;
  await pool.query(`DELETE FROM user_roles WHERE user_id = ANY($1)`, [[USUARIO, OTRO]]);
});

afterAll(async () => {
  if (!pool) return;
  await limpiar();
  await pool.end();
});

soloConBase("la fuente canónica es la que se consulta", () => {
  it("EL CONTROL: `user_roles` existe y es la que se lee", async () => {
    /**
     * Sin este control, todo lo de abajo podría estar pasando porque la tabla no
     * existe y el `catch` devuelve `false` — es decir, los negativos serían
     * verdes sin haber alcanzado nunca la comparación que dicen certificar. Es
     * el defecto exacto que el Bloque 7 documentó en otra puerta.
     */
    const r = await pool.query<{ t: string | null }>(
      `SELECT to_regclass('public.user_roles')::text AS t`,
    );
    expect(r.rows[0]?.t, "`user_roles` no existe: los negativos de abajo no probarían nada").not
      .toBeNull();
  });

  it("las tablas del mecanismo ANTERIOR siguen sin existir", async () => {
    // Si algún día aparecen, hay que decidir a conciencia si vuelven a mandar,
    // en vez de que se conviertan en una segunda fuente en silencio.
    const r = await pool.query<{ os: string | null; rol: string | null }>(
      `SELECT to_regclass('public.os_users')::text AS os,
              (SELECT column_name FROM information_schema.columns
                WHERE table_name = 'nelvyon_users' AND column_name = 'role') AS rol`,
    );
    expect(r.rows[0]?.os).toBeNull();
    expect(r.rows[0]?.rol).toBeNull();
  });
});

soloConBase("conceder y denegar contra PostgreSQL real", () => {
  it("EL CONTROL POSITIVO: con rol `admin`, concede", async () => {
    /**
     * Éste es el que hacía falta y no existía. Sin un positivo real, una función
     * que devolviera `false` siempre —que es LITERALMENTE lo que hacía antes—
     * pasaría todos los negativos de esta suite.
     */
    await asignar(USUARIO, "admin");
    await expect(esAdmin(USUARIO)).resolves.toBe(true);
  });

  it("`super_admin` también concede", async () => {
    await asignar(USUARIO, "super_admin");
    await expect(esAdmin(USUARIO)).resolves.toBe(true);
  });

  it("sin fila, NO concede", async () => {
    await expect(esAdmin(USUARIO)).resolves.toBe(false);
  });

  it("los roles de MENOR nivel no conceden", async () => {
    // La jerarquía de `rbac_management` es super_admin > admin > manager > user
    // > viewer. Sólo los dos primeros administran la plataforma.
    for (const rol of ["manager", "user", "viewer"]) {
      await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [USUARIO]);
      await asignar(USUARIO, rol);
      await expect(esAdmin(USUARIO), `el rol ${rol} dio administrador`).resolves.toBe(false);
    }
  });

  it("un rol REVOCADO (`is_active = false`) deja de conceder", async () => {
    /**
     * Es la razón entera de ir a la base en vez de mirar el token: revocar tiene
     * que surtir efecto ya, no cuando caduque una sesión de ocho horas.
     */
    await asignar(USUARIO, "admin", false);
    await expect(esAdmin(USUARIO)).resolves.toBe(false);
  });

  it("`is_active = NULL` cuenta como activo", async () => {
    // Las filas antiguas traen la columna vacía. Es el mismo criterio que
    // `/rbac/my-role` en Python: si aquí fuera más estricto, un administrador
    // legítimo dejaría de serlo sólo en el lado web.
    await asignar(USUARIO, "admin", null);
    await expect(esAdmin(USUARIO)).resolves.toBe(true);
  });

  it("el rol de OTRO usuario no me hace administrador", async () => {
    await asignar(OTRO, "super_admin");
    await expect(esAdmin(USUARIO)).resolves.toBe(false);
  });

  it("una revocación deja de conceder aunque quede otra fila activa de menor nivel", async () => {
    await asignar(USUARIO, "admin", false);
    await asignar(USUARIO, "viewer", true);
    await expect(esAdmin(USUARIO)).resolves.toBe(false);
  });

  it("entradas absurdas no conceden ni revientan la ruta que llama", async () => {
    for (const id of ["no-es-un-uuid", "", "'; DROP TABLE user_roles; --"]) {
      await expect(esAdmin(id), JSON.stringify(id)).resolves.toBe(false);
    }
    // Y la tabla sigue ahí después de la tercera.
    const r = await pool.query<{ t: string | null }>(
      `SELECT to_regclass('public.user_roles')::text AS t`,
    );
    expect(r.rows[0]?.t).not.toBeNull();
  });
});

describe("la comparación del rol, con un doble", () => {
  /**
   * Con un doble de la base a propósito: lo que se mide aquí NO es la consulta
   * —esa se mide arriba, contra PostgreSQL— sino la comparación que decide.
   * Hacerlo contra la base obligaría a insertar valores que `/rbac/assign`
   * rechaza, así que no se podrían probar.
   */
  async function conRol(role: unknown): Promise<boolean> {
    vi.resetModules();
    vi.doMock("../../db/DbClient", () => ({
      DbClient: {
        getInstance: () => ({
          query: async (sql: string) =>
            sql.includes("user_roles") ? [{ role }] : Promise.reject(new Error("no existe")),
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
    // `/rbac/assign` valida contra un conjunto en minúsculas, así que `Admin` es
    // el mismo rol escrito de otra forma.
    for (const r of ["ADMIN", "Admin", "aDmIn", "SUPER_ADMIN"]) {
      expect(await conRol(r), r).toBe(true);
    }
  });

  it("un rol PARECIDO no cuela", async () => {
    /**
     * `administrator`, `admin_readonly`, `superadmin`, o `admin` con un espacio:
     * si la comparación fuera por prefijo, por `includes` o recortara espacios,
     * cualquiera de estos daría acceso completo al panel de plataforma.
     *
     * Los espacios se dejan FUERA a propósito: `" admin"` no es ese rol escrito
     * de otra forma, es un valor que nadie escribió queriendo. Recortarlo
     * convertiría un carácter invisible en acceso de administración.
     */
    for (const r of [
      "administrator", "admin_readonly", "superadmin", "super-admin", "admin;",
      " admin", "admin ", "adm", "", "sadmin", "admin\n",
    ]) {
      expect(await conRol(r), `el rol ${JSON.stringify(r)} dio administrador`).toBe(false);
    }
  });

  it("un rol que no es texto no concede", async () => {
    for (const r of [null, undefined, 1, true, {}, ["admin"]]) {
      expect(await conRol(r), JSON.stringify(r)).toBe(false);
    }
  });
});
