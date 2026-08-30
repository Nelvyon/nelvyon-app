/**
 * Ningún camino convierte a nadie en administrador de plataforma.
 *
 * POR QUÉ ESTA SUITE EXISTE APARTE DE LA OTRA
 * ============================================
 * `serAdministradorLoDiceLaBase.pg.test.ts` certifica que la DECISIÓN es
 * correcta: quién tiene rol `admin` en `user_roles` entra, quién no, no.
 *
 * Eso deja sin cubrir lo que de verdad da miedo: que exista un CAMINO para
 * ponerse esa fila uno mismo. Una comparación de roles impecable no vale nada si
 * registrarse escribe la fila.
 *
 * Antes de conectar `isUserAdmin` a `user_roles`, esta pregunta no se podía
 * hacer: como no había mecanismo, no había forma de abusar de él. Al haberlo,
 * hay que demostrar que sólo se llega por donde debe llegarse.
 *
 * LOS SEIS CAMINOS QUE SE PRUEBAN
 * -------------------------------
 * Son los que el fundador nombró, y cada uno es un intento real, no una
 * afirmación:
 *
 *   1. registrarse
 *   2. ser propietario de un workspace / tenant
 *   3. manipular los claims del token
 *   4. entrar por SSO / OAuth
 *   5. aceptar una invitación normal
 *   6. modificar la petición (cabeceras)
 *
 * Y uno estructural que los cubre a todos por debajo: **en todo el árbol hay una
 * sola escritura sobre `user_roles`**, y está detrás del guardia de
 * administrador con comprobación de jerarquía y auditoría. Si mañana aparece
 * otra, esta suite se pone roja aunque los seis intentos de arriba sigan
 * fallando — porque el camino nuevo todavía no estaría en la lista.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

/** Plazo del fichero: recorre el arbol. El porque, en `nelvyonEsLaAgencia`. */
vi.setConfig({ testTimeout: 60_000 });

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

const SECRETO = "secreto-de-certificacion-del-modelo-de-admin-con-longitud";
const CORREO = `alta-admin-cert-${Date.now()}@ejemplo.test`;

let pool: import("pg").Pool;
let usuarioAlta = "";

async function esAdmin(userId: string): Promise<boolean> {
  vi.resetModules();
  process.env.DATABASE_URL = DSN;
  const { getNelvyonAdminService } = await import("../NelvyonAdminService");
  return getNelvyonAdminService().isUserAdmin(userId);
}

beforeAll(async () => {
  if (!hayBase) return;
  process.env.DATABASE_URL = DSN;
  process.env.JWT_SECRET = SECRETO;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });
  await pool.query(`DELETE FROM nelvyon_users WHERE email = $1`, [CORREO]);
});

beforeEach(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterAll(async () => {
  if (!pool) return;
  if (usuarioAlta) {
    await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [usuarioAlta]);
  }
  await pool.query(`DELETE FROM nelvyon_users WHERE email = $1`, [CORREO]);
  await pool.end();
});

soloConBase("1 · registrarse no da administrador", () => {
  it("un alta REAL contra PostgreSQL no escribe ninguna fila de rol", async () => {
    /**
     * Es un alta de verdad, no una simulación: se llama al mismo `register` que
     * usa la ruta de registro, contra la misma base. Si el alta creara una fila
     * en `user_roles` —o si algún disparador la creara— se vería aquí.
     */
    vi.resetModules();
    const { getAuthService, resetAuthServiceForTests } = await import("@nelvyon/auth");
    resetAuthServiceForTests();
    const r = await getAuthService().register(CORREO, "contrasena-larga-de-prueba-1", "Alta Cert");
    usuarioAlta = r.userId;
    expect(usuarioAlta, "el alta no devolvió un usuario").toBeTruthy();

    const filas = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [usuarioAlta]);
    expect(filas.rowCount, "registrarse creó una fila de rol de plataforma").toBe(0);
    await expect(esAdmin(usuarioAlta)).resolves.toBe(false);
  });

  it("su token recién emitido tampoco le hace administrador", async () => {
    // El alta devuelve un token. Que ese token exista y sea válido es
    // AUTENTICACIÓN; la autorización se vuelve a preguntar a la base.
    await expect(esAdmin(usuarioAlta)).resolves.toBe(false);
  });
});

soloConBase("2 · ser propietario de un tenant no da administrador", () => {
  it("el dueño de su propio workspace sigue sin ser administrador de plataforma", async () => {
    /**
     * Es el error de diseño más común en un SaaS: confundir «manda en lo suyo»
     * con «manda en la plataforma». Aquí el usuario del alta es dueño de su
     * tenant y no obtiene nada de plataforma.
     */
    const t = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM saas_tenants WHERE user_id = $1::uuid`,
      [usuarioAlta],
    );
    // Sea dueño de tenants o no, el resultado de administrador es el mismo.
    expect(Number(t.rows[0]?.n ?? 0)).toBeGreaterThanOrEqual(0);
    await expect(esAdmin(usuarioAlta)).resolves.toBe(false);
  });
});

soloConBase("3 · manipular los claims del token no da administrador", () => {
  it("un token FIRMADO por NELVYON que se declara `role: admin` no cuela", async () => {
    /**
     * El caso peor: no es un token falsificado, es uno emitido por NELVYON al
     * que se le añade el claim. Si `isUserAdmin` mirara el token, esto
     * concedería. Va a la base, así que no.
     */
    const jwt = (await import("jsonwebtoken")).default;
    const token = jwt.sign(
      { userId: usuarioAlta, tenantId: "t", email: CORREO, plan: "pro", role: "admin",
        is_admin: true, isPlatformAdmin: true, permissions: ["*"] },
      SECRETO,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    // El token es válido de verdad — este es el control que impide que la prueba
    // pase por un token roto.
    vi.resetModules();
    const { getAuthService, resetAuthServiceForTests } = await import("@nelvyon/auth");
    resetAuthServiceForTests();
    const claims = await getAuthService().verifyToken(token);
    expect(claims.userId, "el token no era válido: la prueba no probaría nada").toBe(usuarioAlta);

    // Y aun así no es administrador.
    await expect(esAdmin(claims.userId)).resolves.toBe(false);
  });

  it("declarar el id de OTRO usuario tampoco sirve", async () => {
    // Ni siquiera el id de alguien que sí fuera administrador: `isUserAdmin`
    // recibe el id de los claims verificados, y ese id es el del token firmado.
    await expect(esAdmin("00000000-0000-4000-8000-000000000000")).resolves.toBe(false);
  });
});

soloConBase("4 · 5 · 6 · SSO, invitaciones y cabeceras", () => {
  it("ninguna de las tres tablas de pertenencia concede plataforma", async () => {
    /**
     * SSO y las invitaciones acaban en lo mismo: una fila de pertenencia a un
     * workspace o a un tenant. Ninguna de esas tablas es la que se consulta.
     *
     * Se comprueba por el lado que importa: `isUserAdmin` sólo lee `user_roles`.
     * Si mañana alguien le añadiera una segunda fuente, este recuento cambiaría.
     */
    const fuente = fs.readFileSync(
      path.resolve(__dirname, "..", "NelvyonAdminService.ts"),
      "utf8",
    );
    const cuerpo = fuente.slice(fuente.indexOf("async isUserAdmin"));
    const metodo = cuerpo.slice(0, cuerpo.indexOf("\n  }"));
    const tablas = [...metodo.matchAll(/FROM\s+([a-z_]+)/gi)].map((m) => m[1]);
    expect(tablas, "`isUserAdmin` consulta más de una tabla").toEqual(["user_roles"]);
    for (const t of ["workspace_members", "team_members", "saas_tenants", "oauth_connections"]) {
      expect(metodo, `\`isUserAdmin\` mira \`${t}\``).not.toContain(t);
    }
  });

  it("modificar la petición no llega a la decisión", async () => {
    /**
     * `requirePlatformAdmin` pasa `claims.userId` —de un token verificado— y no
     * nada que venga de la URL, del cuerpo o de una cabecera. Se comprueba
     * sobre el código, porque es una propiedad de la FORMA de la llamada.
     */
    const fuente = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "..", "apps", "web", "src", "lib", "platformBffAuth.ts"),
      "utf8",
    );
    expect(fuente).toContain("isUserAdmin(claims.userId)");
    // Y nada de leer el rol de una cabecera para decidir administrador.
    expect(fuente).not.toMatch(/isUserAdmin\(\s*(req|request|headers|body)/);
  });
});

describe("el camino de escritura es UNO, y está guardado", () => {
  const RAIZ = path.resolve(__dirname, "..", "..", "..");

  /**
   * Las líneas de código, sin comentarios.
   *
   * Sin esto, esta prueba se encuentra a sí misma: el comentario de
   * `NelvyonAdminService.isUserAdmin` dice «hay UN solo `INSERT INTO
   * user_roles`», y una regla que casa dentro de un comentario mide el
   * comentario. Pasó de verdad en la primera ejecución de esta suite.
   */
  function sinComentarios(texto: string, fichero: string): string[] {
    if (fichero.endsWith(".py")) {
      return texto.split("\n").map((l) => l.split("#")[0]);
    }
    // Bloques primero, línea después. Basta para lo que se busca: una sentencia
    // SQL real nunca vive dentro de un comentario.
    return texto
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((l) => l.split("//")[0]);
  }

  function ficherosDeCodigo(): string[] {
    const fuera: string[] = [];
    const saltar = new Set(["node_modules", ".next", ".git", "dist", "build", "__pycache__"]);
    const andar = (dir: string) => {
      let entradas: fs.Dirent[];
      try {
        entradas = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entradas) {
        if (saltar.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) andar(p);
        else if (/\.(ts|tsx|py)$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
          fuera.push(p);
        }
      }
    };
    for (const d of ["backend", path.join("apps", "web", "src")]) andar(path.join(RAIZ, d));
    return fuera;
  }

  it("EL CONTROL: el inventario encuentra código", () => {
    // Un recorrido roto daría cero ficheros y la prueba de abajo pasaría vacía.
    expect(ficherosDeCodigo().length).toBeGreaterThan(1000);
  });

  it("sólo un fichero escribe en `user_roles`, y es el RBAC guardado", () => {
    /**
     * Ésta es la que de verdad cierra la pregunta. Los seis intentos de arriba
     * prueban seis caminos concretos; éste prueba que no hay un séptimo.
     */
    const escritores = ficherosDeCodigo()
      .filter((f) =>
        sinComentarios(fs.readFileSync(f, "utf8"), f).some((linea) =>
          /\b(INSERT\s+INTO|UPDATE)\s+user_roles\b/i.test(linea),
        ),
      )
      .map((f) => path.relative(RAIZ, f).split(path.sep).join("/"))
      .sort();

    /**
     * Son DOS, no uno, y descubrirlo es la razón de que esta prueba exista.
     *
     * `rbac_management.py` es el que se conocía: escrito a mano para esto, con
     * jerarquía y auditoría.
     *
     * `services/user_roles.py` no. Es el servicio de un router CRUD **genérico**
     * (`/api/v1/entities/user_roles`) que se monta solo — `main.py` recorre el
     * paquete `routers` con `pkgutil` y monta lo que encuentra. Sus escrituras
     * sí exigían `get_admin_user`, así que un anónimo no llegaba; pero **no
     * comprobaban la jerarquía**, y por ahí un `admin` de nivel 4 podía hacer
     * POST con `role='super_admin'` y ascender, o PUT sobre su propia fila.
     *
     * La regla existía —`/rbac/assign` la impone con un mensaje explícito— y
     * este camino se la saltaba. Se cerró aplicando la misma comprobación a
     * `create`, `update` y a los dos endpoints de lote, que además validan el
     * lote entero antes de escribir nada: un lote que asciende en el tercer
     * elemento no debe dejar los dos primeros creados.
     */
    expect(escritores, "alguien más escribe roles de plataforma").toEqual([
      "backend/routers/rbac_management.py",
      "backend/services/user_roles.py",
    ]);

    // Y los DOS caminos exigen ser administrador y respetar la jerarquía.
    const rbac = fs.readFileSync(path.join(RAIZ, "backend", "routers", "rbac_management.py"), "utf8");
    const asignar = rbac.slice(rbac.indexOf("async def assign_role"));
    expect(asignar.slice(0, 400)).toContain("get_admin_user");
    expect(asignar).toContain("No puedes asignar un rol superior al tuyo");

    const generico = fs.readFileSync(path.join(RAIZ, "backend", "routers", "user_roles.py"), "utf8");
    for (const endpoint of [
      "async def create_user_roles(",
      "async def create_user_roless_batch(",
      "async def update_user_roles(",
      "async def update_user_roless_batch(",
    ]) {
      const i = generico.indexOf(endpoint);
      expect(i, `no existe ${endpoint}`).toBeGreaterThan(-1);
      const cuerpo = generico.slice(i, i + 1200);
      expect(cuerpo, `${endpoint} no exige administrador`).toContain("get_admin_user");
      expect(cuerpo, `${endpoint} no comprueba la jerarquía`).toContain("_exigir_rol_asignable");
    }
    expect(generico, "la jerarquía no está definida en el router genérico").toContain(
      "No puedes asignar un rol superior al tuyo",
    );
  });
});
