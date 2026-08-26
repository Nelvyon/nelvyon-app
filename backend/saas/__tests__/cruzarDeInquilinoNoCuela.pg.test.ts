/**
 * BLOQUE 7 · el inquilino A no llega al inquilino B.
 *
 * `requireSaasContext` es la puerta de **398 rutas**, y decide sobre qué
 * inquilino trabajas leyendo la petición:
 *
 *     resolveTenantAccess(claims.userId, extractPreferredTenantId(req))
 *
 * `extractPreferredTenantId` saca el inquilino de la cabecera
 * `x-nelvyon-tenant-id` o de la cookie `nelvyon_saas_tenant_id`. Las dos las
 * controla enteramente el cliente. Un atacante autenticado no tiene más que
 * cambiar una cabecera.
 *
 * Que eso funcione bien depende de una sola cosa: que el valor de la petición se
 * comprueba contra la **pertenencia real**, y que cuando no hay pertenencia se
 * cierra en falso en vez de caer al inquilino propio en silencio. Una caída
 * silenciosa sería peor que un fallo: el atacante creería haber fracasado
 * mientras la aplicación le sirve sus propios datos, y el defecto pasaría
 * inadvertido hasta el día en que la caída fuera al revés.
 *
 * Se prueba contra PostgreSQL REAL: la pertenencia vive en `workspace_members`
 * y `saas_tenants`, y un doble en memoria probaría mi doble en vez de la
 * consulta que decide.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

// Import ESTATICO a proposito.
//
// Cargar `saasRequestContext` cuesta **10 730 ms medidos**: arrastra el grafo
// entero de servicios del panel. Con `await import(...)` dentro del primer test,
// ese coste se paga dentro de su presupuesto de 5 s y la prueba muere por
// tiempo — sin que el producto tenga nada que ver.
//
// Es el mismo defecto que el Bloque 4 midio con el SDK de Stripe (2687 ms
// dentro del caso). La correccion es la misma y no es subir el plazo: es pagar
// el import al cargar el fichero. La llamada de verdad tarda 29 ms.
import { requireSaasContext } from "../saasRequestContext";
import { resetAuthServiceForTests } from "../../auth/AuthService";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

const SECRETO = "secreto-de-certificacion-bloque-7-con-longitud-de-sobra";

// Identificadores fijos para poder limpiar sin tocar nada más.
const USUARIO_A = "11111111-1111-4111-8111-111111111111";
const USUARIO_B = "22222222-2222-4222-8222-222222222222";
const WS_A = 970001;
const WS_B = 970002;

let pool: import("pg").Pool;
let tenantA = "";
let tenantB = "";

function tokenDe(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@ejemplo.test`, plan: "pro" },
    SECRETO,
    { algorithm: "HS256", expiresIn: "1h" },
  );
}

function peticion(token: string, cabeceras: Record<string, string> = {}): Request {
  return new Request("https://nelvyon.test/api/saas/crm/contacts", {
    headers: { authorization: `Bearer ${token}`, ...cabeceras },
  });
}

beforeAll(async () => {
  if (!hayBase) return;
  process.env.JWT_SECRET = SECRETO;
  process.env.DATABASE_URL = DSN;
  process.env.NELVYON_AI_ENABLED = "0";

  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });

  await limpiar();

  // `saas_tenants.user_id` referencia a `nelvyon_users`: sin los usuarios, la
  // clave foránea tumba la fixture y los siete ataques quedan «saltados».
  await pool.query(
    `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
     VALUES ($1,'a@ejemplo.test','x','Usuario A','pro'),
            ($2,'b@ejemplo.test','x','Usuario B','pro')
     ON CONFLICT (user_id) DO NOTHING`,
    [USUARIO_A, USUARIO_B],
  );

  // Dos inquilinos completos y sin relación entre ellos.
  // `workspaces.user_id` es el dueño y es NOT NULL: la primera versión de esta
  // fixture usaba `owner_id`, que no existe, y el `catch` de reserva insertaba
  // sin dueño y violaba la restricción. Un montaje que se cae no es un fallo del
  // producto, pero deja los siete ataques en «saltados» — que es la peor forma
  // de pasar: parece que no hay nada rojo.
  await pool.query(
    `INSERT INTO workspaces (id, user_id, name) VALUES ($1,$3,'WS A'), ($2,$4,'WS B')
     ON CONFLICT (id) DO NOTHING`,
    [WS_A, WS_B, USUARIO_A, USUARIO_B],
  );

  const a = await pool.query(
    `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, workspace_id)
     VALUES ($1,'Empresa A','salud','pro',true,$2) RETURNING id`,
    [USUARIO_A, WS_A],
  );
  const b = await pool.query(
    `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, workspace_id)
     VALUES ($1,'Empresa B','legal','pro',true,$2) RETURNING id`,
    [USUARIO_B, WS_B],
  );
  tenantA = a.rows[0].id;
  tenantB = b.rows[0].id;

  await pool.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role, status)
     VALUES ($1,$3,'owner','active'), ($2,$4,'owner','active')`,
    [WS_A, WS_B, USUARIO_A, USUARIO_B],
  );
});

async function limpiar(): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM workspace_members WHERE workspace_id IN ($1,$2)`, [WS_A, WS_B]);
  await pool.query(`DELETE FROM saas_tenants WHERE user_id IN ($1,$2)`, [USUARIO_A, USUARIO_B]);
  await pool.query(`DELETE FROM workspaces WHERE id IN ($1,$2)`, [WS_A, WS_B]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id IN ($1,$2)`, [USUARIO_A, USUARIO_B]);
}

afterAll(async () => {
  await limpiar();
  if (pool) await pool.end();
});

beforeEach(() => {
  resetAuthServiceForTests();
});

soloConBase("BLOQUE 7 · cambiar de inquilino por cabecera", () => {
  it("EL CONTROL: A entra en SU propio inquilino", async () => {
    /**
     * Sin este control, una puerta que denegara todo pasaría cada ataque de
     * abajo y dejaría a los clientes sin poder usar el producto. Es lo que
     * convierte los negativos en evidencia.
     */
    const ctx = await requireSaasContext(peticion(tokenDe(USUARIO_A, tenantA)), "contacts.read");
    expect(ctx.tenant.id).toBe(tenantA);
  });

  it("A pidiendo el inquilino de B por CABECERA se rechaza", async () => {
    /**
     * El ataque directo: usuario legítimo, token legítimo, y una cabecera
     * `x-nelvyon-tenant-id` apuntando a otro cliente. Es lo primero que
     * probaría cualquiera con las herramientas del navegador abiertas.
     */
    await expect(
      requireSaasContext(
        peticion(tokenDe(USUARIO_A, tenantA), { "x-nelvyon-tenant-id": tenantB }),
        "contacts.read",
      ),
      "el usuario A opero sobre el inquilino de B cambiando una cabecera",
    ).rejects.toThrow();
  });

  it("A pidiendo el inquilino de B por COOKIE se rechaza", async () => {
    // La cookie es tan del cliente como la cabecera. Proteger una y no la otra
    // es no proteger ninguna.
    await expect(
      requireSaasContext(
        peticion(tokenDe(USUARIO_A, tenantA), {
          cookie: `nelvyon_saas_tenant_id=${tenantB}`,
        }),
        "contacts.read",
      ),
      "el usuario A cruzo de inquilino por cookie",
    ).rejects.toThrow();
  });

  it("un inquilino que NO EXISTE se rechaza, no cae al propio", async () => {
    /**
     * La caída silenciosa sería peor que el fallo: el atacante creería haber
     * fracasado mientras la aplicación le sirve sus propios datos, y nadie
     * descubriría el defecto hasta el día en que la caída fuera hacia el otro
     * lado.
     */
    await expect(
      requireSaasContext(
        peticion(tokenDe(USUARIO_A, tenantA), {
          "x-nelvyon-tenant-id": "99999999-9999-4999-8999-999999999999",
        }),
        "contacts.read",
      ),
      "pedir un inquilino inexistente cayo en silencio al inquilino propio",
    ).rejects.toThrow();
  });

  it("el `tenantId` del PROPIO token no manda sobre la pertenencia", async () => {
    /**
     * Sutil y peligroso: el token va firmado, así que su `tenantId` parece de
     * fiar. Pero lo firmó NELVYON en su día, y si un usuario cambia de
     * organización o le revocan el acceso, ese token sigue diciendo lo de antes.
     *
     * Aquí se fabrica un token válido de A cuyo `tenantId` dice B. La firma es
     * correcta; la pertenencia, no. Lo que tiene que mandar es la pertenencia.
     */
    const ctx = await requireSaasContext(peticion(tokenDe(USUARIO_A, tenantB)), "contacts.read");
    expect(
      ctx.tenant.id,
      "el `tenantId` del token le dio acceso a un inquilino del que no es miembro",
    ).toBe(tenantA);
  });

  it("B tampoco llega a A: la dirección contraria también está cerrada", async () => {
    // Un aislamiento que solo funcione en un sentido no es aislamiento.
    await expect(
      requireSaasContext(
        peticion(tokenDe(USUARIO_B, tenantB), { "x-nelvyon-tenant-id": tenantA }),
        "contacts.read",
      ),
      "el usuario B alcanzo el inquilino de A",
    ).rejects.toThrow();
  });

  it("un usuario SIN inquilino no hereda ninguno", async () => {
    // Sin pertenencia no hay contexto que dar. Devolver el primero que haya
    // sería regalar un inquilino a cualquiera con una cuenta.
    const huerfano = "33333333-3333-4333-8333-333333333333";
    await expect(
      requireSaasContext(peticion(tokenDe(huerfano, tenantA)), "contacts.read"),
      "un usuario sin inquilino recibio uno",
    ).rejects.toThrow();
  });
});

soloConBase("BLOQUE 7 · una accion que no existe no se permite", () => {
  it("un nombre de accion inventado se deniega", async () => {
    /**
     * Lo destapo un error mio: la primera version de esta suite pedia
     * `crm.read`, que **no existe** —la accion real es `contacts.read`— y
     * `assertSaasPermission` la denegó.
     *
     * Que denegara es lo correcto y merece quedar asegurado: si una accion
     * desconocida se permitiera, cualquier ruta nueva que se equivocara de
     * nombre quedaria abierta de par en par, y el error seria invisible porque
     * todo «funcionaria».
     *
     * En autorizacion, lo que no esta permitido esta prohibido — tambien cuando
     * lo que falta es el propio nombre del permiso.
     */
    await expect(
      requireSaasContext(
        peticion(tokenDe(USUARIO_A, tenantA)),
        "accion.que.no.existe" as never,
      ),
      "una accion inexistente se dejo pasar: un error de nombre abriria la ruta",
    ).rejects.toThrow();
  });
});
