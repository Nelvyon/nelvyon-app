/**
 * RLS EFECTIVA con el rol candidato `nelvyon_web_app`, por el camino real.
 *
 * QUE HACE ESTA DISTINTA DE TODAS LAS ANTERIORES
 * -----------------------------------------------
 * Las demás certifican que la CONSULTA acota. Ésta certifica que, aunque la
 * consulta NO acotara, la base lo impediría igual: se conecta con un rol sin
 * SUPERUSER y sin BYPASSRLS, y las consultas se escriben a propósito **sin
 * ningún filtro de inquilino**. Todo lo que separa a A de B aquí son las
 * políticas.
 *
 * Es la única forma de saber si retirar `postgres` del servicio web funcionará,
 * en vez de descubrirlo en producción.
 *
 * LAS FUNCIONES SON LAS DE PRODUCCIÓN, NO UNA APROXIMACIÓN
 * ---------------------------------------------------------
 * `nelvyon_os_workspace_select`, `nelvyon_user_in_workspace` y las 17 restantes
 * se extrajeron del catálogo en vivo con `pg_get_functiondef` y se instalaron
 * tal cual. Escribir una versión «equivalente» habría certificado mi versión, no
 * la que va a decidir.
 *
 * La política exige DOS cosas a la vez: que el `workspace_id` de la fila sea el
 * del contexto, y que el usuario del contexto pertenezca a ese workspace. Por eso
 * el contexto incompleto —uno de los dos— deniega.
 *
 * LOS CONTROLES POSITIVOS SON OBLIGATORIOS
 * -----------------------------------------
 * Una configuración que no deje ver NADA a NADIE aprueba las cuatro negativas y
 * no aísla: sólo está rota. Por cada denegación hay su permiso correspondiente.
 *
 * FIXTURE PROPIA
 * --------------
 * Usa `cert_os_rls` y no una tabla compartida. Al principio reutilizaba
 * `os_truth_guard_audits`, que otro fichero de pruebas también siembra: vitest
 * ejecuta los ficheros en PARALELO, así que la siembra de uno vaciaba la del otro
 * y aparecía un fallo que parecía de aislamiento y era de fixture.
 *
 * Un falso rojo cuesta lo mismo que un falso verde: los dos hacen desconfiar de
 * la prueba en vez del código.
 *
 * Se salta sin `NELVYON_WEB_APP_CERT_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  crearMesaDeCertificacion,
  FAMILIAS_REALES,
  sembrarSujetosReales,
  type PredicadosReales,
} from "./politicasRealesDeCertificacion";

const DSN = process.env.NELVYON_WEB_APP_CERT_DSN;
const describeSiHayRol = DSN ? describe : describe.skip;

const WS_A = 101;
const WS_B = 202;
const USUARIO_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const USUARIO_B = "bbbbbbbb-2222-4000-8000-00000000000b";
const AJENO = "cccccccc-3333-4000-8000-00000000000c";

let pool: import("pg").Pool;
/** Conexión de siembra, con el dueño de las tablas (no pasa por las políticas). */
let siembra: import("pg").Pool;
/** Los predicados que se leyeron del catálogo para montar la mesa. */
let predicados: PredicadosReales;

type Ctx = { ws?: number | null; usuario?: string | null };

/**
 * Ejecuta como el rol candidato, con el contexto pedido y en UNA transacción.
 *
 * Reproduce lo que hace `DbClient`: BEGIN, `set_config(..., true)`, trabajo,
 * COMMIT. Aquí se escribe explícito para que la prueba no dependa de que
 * `DbClient` esté bien: si dependiera, un fallo de `DbClient` se vería como un
 * fallo de RLS y viceversa.
 */
async function comoWebApp<T>(
  ctx: Ctx,
  fn: (c: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    if (ctx.usuario) await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ctx.usuario]);
    if (ctx.ws != null) await c.query("SELECT set_config('app.workspace_id', $1, true)", [String(ctx.ws)]);
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

const A = { ws: WS_A, usuario: USUARIO_A };
const B = { ws: WS_B, usuario: USUARIO_B };

describeSiHayRol("RLS efectiva con nelvyon_web_app (PostgreSQL real)", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 1 });   // max=1: misma conexión física
    siembra = new Pool({
      connectionString: process.env.NELVYON_WEB_CERT_DSN,
      max: 2,
    });

    /**
     * LA MESA SE MONTA SOLA, Y CON LA POLITICA DE VERDAD.
     *
     * `cert_os_rls` no existia en ningun fichero del arbol: se creo a mano en
     * alguna base local durante el Bloque 8. Es decir, la certificacion de RLS
     * efectiva —la que decide si se puede retirar `postgres` del servicio web—
     * dependia de un objeto que nadie podia reconstruir leyendo el repositorio.
     *
     * No se noto porque sin DSN el fichero se omitia entero, y una prueba que
     * no corre no puede quejarse. Al levantar PostgreSQL en local fallaron 21
     * de golpe.
     *
     * La politica NO se escribe aqui: `crearMesaDeCertificacion` la lee del
     * catalogo vivo y la aplica tal cual. Escribir una version «equivalente»
     * certificaria mi version, no la que decide.
     */
    predicados = await crearMesaDeCertificacion(siembra, {
      tabla: "cert_os_rls",
      familia: FAMILIAS_REALES.porWorkspaceOs,
      columnas: ["channel text", "status text", "content_preview text"],
    });
    await sembrarSujetosReales(siembra);
  });

  it("la mesa lleva la politica REAL, no una simplificacion", () => {
    /**
     * EL GUARDIAN DE LA DERIVACION. Si `crearMesaDeCertificacion` dejara de
     * encontrar la familia y cayera en cualquier otra cosa, todo lo de abajo
     * seguiria pasando —aislaria igual— pero estaria certificando una politica
     * que el producto no usa.
     *
     * Se comprueba que el predicado es el de la familia OS y que esa familia
     * cubre de verdad decenas de tablas del producto.
     */
    expect(predicados.seleccionar).toContain("nelvyon_os_workspace_select");
    expect(predicados.insertar).toContain("nelvyon_os_workspace_mutate");
    expect(
      predicados.tablas,
      "la familia OS ya no cubre casi ninguna tabla: esta prueba mediria una excepcion",
    ).toBeGreaterThanOrEqual(50);
  });

  afterAll(async () => { await pool?.end(); await siembra?.end(); });

  beforeEach(async () => {
    await siembra.query("TRUNCATE cert_os_rls");
    for (const ws of [WS_A, WS_B]) {
      await siembra.query(
        `INSERT INTO cert_os_rls (channel, workspace_id, status, content_preview)
         VALUES ('landing',$1,'blocked',$2), ('email',$1,'passed',$2)`,
        [ws, `fila-del-workspace-${ws}`]);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // El rol, antes de nada
  // ═══════════════════════════════════════════════════════════════════════════

  it("el rol no es superusuario ni salta RLS", async () => {
    // Si lo fuera, TODAS las pruebas de abajo pasarian por la razon equivocada:
    // no por aislamiento, sino porque el rol lo ve todo y las consultas de la
    // prueba resultan mirar lo suyo.
    const { rows } = await pool.query(
      "SELECT current_user AS u, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user");
    expect(rows[0].u).toBe("nelvyon_web_app");
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolbypassrls).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECT — sin un solo WHERE de inquilino en la consulta
  // ═══════════════════════════════════════════════════════════════════════════

  it("SELECT · A ve lo suyo y SOLO lo suyo", async () => {
    const filas = await comoWebApp(A, async (c) =>
      (await c.query("SELECT workspace_id, content_preview FROM cert_os_rls")).rows);
    expect(filas.length).toBe(2);                                  // control positivo
    expect(filas.every((f) => f.workspace_id === WS_A)).toBe(true);
  });

  it("SELECT · B ve lo suyo y SOLO lo suyo", async () => {
    const filas = await comoWebApp(B, async (c) =>
      (await c.query("SELECT workspace_id FROM cert_os_rls")).rows);
    expect(filas.length).toBe(2);
    expect(filas.every((f) => f.workspace_id === WS_B)).toBe(true);
  });

  it("SELECT · sin contexto no se ve NADA (fail-closed)", async () => {
    const filas = await comoWebApp({}, async (c) =>
      (await c.query("SELECT * FROM cert_os_rls")).rows);
    expect(filas).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INSERT / UPDATE / DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  it("INSERT · A puede escribir en lo suyo", async () => {
    const r = await comoWebApp(A, async (c) =>
      c.query(`INSERT INTO cert_os_rls (channel, workspace_id, status)
               VALUES ('ads',$1,'passed') RETURNING id`, [WS_A]));
    expect(r.rowCount).toBe(1);
  });

  it("INSERT · A NO puede escribir en el workspace de B", async () => {
    // La politica de INSERT es `WITH CHECK`: no filtra, RECHAZA. Tiene que dar
    // error, no silencio — escribir en el inquilino ajeno y creer que fue bien
    // seria peor que no poder escribir.
    await expect(comoWebApp(A, async (c) =>
      c.query(`INSERT INTO cert_os_rls (channel, workspace_id, status)
               VALUES ('ads',$1,'passed')`, [WS_B]))).rejects.toThrow(/row-level security/i);
  });

  it("UPDATE · A modifica lo suyo", async () => {
    const r = await comoWebApp(A, async (c) =>
      c.query("UPDATE cert_os_rls SET status = 'warning'"));
    expect(r.rowCount).toBe(2);                                    // control positivo
  });

  it("UPDATE · un UPDATE sin filtro no toca NI UNA fila de B", async () => {
    // La consulta no lleva `WHERE workspace_id`: si el aislamiento dependiera de
    // la consulta, este UPDATE reescribiria las cuatro filas.
    await comoWebApp(A, async (c) =>
      c.query("UPDATE cert_os_rls SET status = 'tocado-por-A'"));
    const deB = await siembra.query(
      "SELECT count(*)::int AS n FROM cert_os_rls WHERE workspace_id = $1 AND status = 'tocado-por-A'",
      [WS_B]);
    expect(deB.rows[0].n).toBe(0);
  });

  it("DELETE · A borra lo suyo", async () => {
    const r = await comoWebApp(A, async (c) => c.query("DELETE FROM cert_os_rls"));
    expect(r.rowCount).toBe(2);
  });

  it("DELETE · un DELETE sin filtro no borra NI UNA fila de B", async () => {
    await comoWebApp(A, async (c) => c.query("DELETE FROM cert_os_rls"));
    const quedan = await siembra.query(
      "SELECT count(*)::int AS n FROM cert_os_rls WHERE workspace_id = $1", [WS_B]);
    expect(quedan.rows[0].n).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RBAC en la propia base: leer no es escribir
  // ═══════════════════════════════════════════════════════════════════════════

  it("un miembro `viewer` LEE lo de su workspace pero no puede escribir", async () => {
    // `nelvyon_workspace_can_mutate` exige rol `owner`, `admin` u `operator`;
    // `nelvyon_os_workspace_select` solo exige pertenencia. Es decir, la
    // separacion entre leer y escribir no depende de que la aplicacion se acuerde
    // de comprobarla: esta en la base.
    //
    // Importa porque una escalada en la capa de aplicacion —de las que ya
    // aparecieron tres en este trabajo— no bastaria para escribir.
    const viewer = "dddddddd-4444-4000-8000-00000000000d";
    await siembra.query(
      `INSERT INTO workspace_members (workspace_id, user_id, status, role)
       VALUES ($1, $2, 'active', 'viewer')`, [WS_A, viewer]);
    try {
      const ctx = { ws: WS_A, usuario: viewer };
      const leidas = await comoWebApp(ctx, async (c) =>
        (await c.query("SELECT * FROM cert_os_rls")).rows);
      expect(leidas).toHaveLength(2);                       // control positivo: SI lee

      await expect(comoWebApp(ctx, async (c) =>
        c.query(`INSERT INTO cert_os_rls (channel, workspace_id, status)
                 VALUES ('ads',$1,'passed')`, [WS_A])))
        .rejects.toThrow(/row-level security/i);            // y NO escribe
    } finally {
      await siembra.query("DELETE FROM workspace_members WHERE user_id = $1", [viewer]);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Contexto incompleto y contexto falso
  // ═══════════════════════════════════════════════════════════════════════════

  it("contexto incompleto · con workspace pero sin usuario, nada", async () => {
    const filas = await comoWebApp({ ws: WS_A }, async (c) =>
      (await c.query("SELECT * FROM cert_os_rls")).rows);
    expect(filas).toHaveLength(0);
  });

  it("contexto incompleto · con usuario pero sin workspace, nada", async () => {
    const filas = await comoWebApp({ usuario: USUARIO_A }, async (c) =>
      (await c.query("SELECT * FROM cert_os_rls")).rows);
    expect(filas).toHaveLength(0);
  });

  it("contexto falso · declarar el workspace de B sin pertenecer a el no sirve", async () => {
    // LA PRUEBA CONTRA EL ATAQUE OBVIO: si el aislamiento dependiera solo de
    // `app.workspace_id`, bastaria con declarar otro numero. La politica exige
    // ADEMAS pertenencia, comprobada contra `workspaces`/`workspace_members`.
    const filas = await comoWebApp({ ws: WS_B, usuario: USUARIO_A }, async (c) =>
      (await c.query("SELECT * FROM cert_os_rls")).rows);
    expect(filas).toHaveLength(0);
  });

  it("contexto falso · un usuario que no existe no ve nada", async () => {
    const filas = await comoWebApp({ ws: WS_A, usuario: AJENO }, async (c) =>
      (await c.query("SELECT * FROM cert_os_rls")).rows);
    expect(filas).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // La misma conexión física, peticiones encadenadas
  // ═══════════════════════════════════════════════════════════════════════════

  it("A → B → A sobre la MISMA conexion: cada uno ve solo lo suyo", async () => {
    // `max: 1` en el pool: las tres comparten conexion. Si el contexto
    // sobreviviera al COMMIT, la segunda o la tercera lo notarian.
    const a1 = await comoWebApp(A, async (c) =>
      (await c.query("SELECT workspace_id FROM cert_os_rls")).rows);
    const b = await comoWebApp(B, async (c) =>
      (await c.query("SELECT workspace_id FROM cert_os_rls")).rows);
    const a2 = await comoWebApp(A, async (c) =>
      (await c.query("SELECT workspace_id FROM cert_os_rls")).rows);

    expect(a1.every((f) => f.workspace_id === WS_A)).toBe(true);
    expect(b.every((f) => f.workspace_id === WS_B)).toBe(true);
    expect(a2.every((f) => f.workspace_id === WS_A)).toBe(true);
    expect(a1).toHaveLength(2);
    expect(b).toHaveLength(2);
  });

  it("A → sin contexto → A: la del medio no hereda y las de fuera si ven", async () => {
    await comoWebApp(A, async (c) => c.query("SELECT * FROM cert_os_rls"));
    const medio = await comoWebApp({}, async (c) =>
      (await c.query("SELECT * FROM cert_os_rls")).rows);
    const despues = await comoWebApp(A, async (c) =>
      (await c.query("SELECT * FROM cert_os_rls")).rows);
    expect(medio).toHaveLength(0);       // no heredo
    expect(despues).toHaveLength(2);     // y no se quedo roto tampoco
  });

  it("un error dentro de la transaccion no deja contexto para la siguiente", async () => {
    await expect(comoWebApp(A, async (c) =>
      c.query("SELECT 1 FROM tabla_que_no_existe"))).rejects.toThrow();
    const sinCtx = await comoWebApp({}, async (c) =>
      (await c.query("SELECT * FROM cert_os_rls")).rows);
    expect(sinCtx).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Lo que el rol NO puede hacer
  // ═══════════════════════════════════════════════════════════════════════════

  it("no puede crear objetos en el esquema", async () => {
    await expect(pool.query("CREATE TABLE intento_de_creacion (x int)")).rejects.toThrow();
  });

  it("FORCE esta puesto, aunque desde aqui no pueda notarse", async () => {
    /**
     * ── UNA MUTACION QUE SOBREVIVE, Y POR QUE SE DEJA ASI ──────────────────
     *
     * Quitar `FORCE ROW LEVEL SECURITY` de la mesa no rompe ninguna de las
     * pruebas de este fichero. Se intento escribir una que lo notara y NO se
     * puede, por dos razones que se acumulan:
     *
     *   · las pruebas leen como `nelvyon_web_app`, que no es el dueño de la
     *     tabla, y a un no-dueño la politica le aplica con FORCE o sin el;
     *   · la conexion de siembra es `nelvyon`, que es SUPERUSUARIO, y un
     *     superusuario se salta RLS tenga FORCE o no.
     *
     * O sea que FORCE solo cambiaria algo con un propietario que no fuera
     * superusuario, y esa configuracion no existe aqui. Escribir una prueba
     * «de comportamiento» que en realidad no distinguiera nada seria peor que
     * no tenerla: pareceria cubrir lo que no cubre.
     *
     * Lo que si se puede afirmar es que la bandera esta puesta. Eso es lo que
     * se comprueba, y el comentario dice exactamente hasta donde llega.
     */
    const { rows } = await siembra.query<{ f: boolean }>(
      "SELECT relforcerowsecurity AS f FROM pg_class WHERE relname = 'cert_os_rls'",
    );
    expect(rows[0].f, "la mesa perdio FORCE").toBe(true);
  });

  it("la pertenencia solo cuenta si esta `active`", async () => {
    /**
     * LA OTRA MITAD QUE FALTABA, y la encontro otra mutacion.
     *
     * `nelvyon_user_in_workspace` acepta por dos vias:
     *
     *     w.user_id = jwt_sub                        ← es el dueño
     *     wm.user_id = jwt_sub AND wm.status='active' ← es miembro activo
     *
     * Los sujetos sembrados cumplen LAS DOS: son dueños en `workspaces` y ademas
     * miembros. Asi que al cambiar la siembra a `status='invited'` no pasaba
     * nada —la rama de propiedad seguia dejandolos entrar— y la exigencia de
     * `active` no estaba medida por nadie.
     *
     * Importa mas de lo que parece: es la misma palabra que fija la migracion
     * 590 y la que decide si una invitacion consume asiento. Aqui decide ademas
     * si se ven los datos.
     *
     * Se usa un usuario que NO es dueño de nada, para que la unica via posible
     * sea la pertenencia.
     */
    const soloMiembro = "eeeeeeee-5555-4000-8000-00000000000e";
    await siembra.query(
      `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at)
       VALUES ($1, $2, $3, 'member', 'active', NOW()::text)`,
      [WS_A, soloMiembro, "solo-miembro@ejemplo.test"],
    );
    try {
      const ctx = { ws: WS_A, usuario: soloMiembro };

      // Control positivo: activo, ve lo suyo.
      const activo = await comoWebApp(ctx, async (c) =>
        (await c.query("SELECT workspace_id FROM cert_os_rls")).rows);
      expect(activo, "un miembro activo no ve lo de su workspace").toHaveLength(2);

      // Y en cuanto deja de estar activo, deja de ver.
      await siembra.query(
        "UPDATE workspace_members SET status = 'invited' WHERE user_id = $1", [soloMiembro]);
      const invitado = await comoWebApp(ctx, async (c) =>
        (await c.query("SELECT workspace_id FROM cert_os_rls")).rows);
      expect(
        invitado,
        "una pertenencia que no esta `active` sigue dando acceso a los datos",
      ).toHaveLength(0);
    } finally {
      await siembra.query("DELETE FROM workspace_members WHERE user_id = $1", [soloMiembro]);
    }
  });

  it("no puede leer una tabla que no se le concedio", async () => {
    /**
     * LA TABLA DE EJEMPLO SE BUSCA, NO SE ESCRIBE.
     *
     * Antes estaba fija: `os_agent_data_cache`. Cuando se escribio, el rol no
     * tenia privilegio sobre ella; una migracion posterior se lo concedio
     * —INSERT y SELECT— y la prueba empezo a fallar señalando un problema de
     * permisos que no existia.
     *
     * Una prueba que nombra un ejemplo concreto certifica ese ejemplo, no la
     * propiedad. La propiedad es «el rol NO tiene acceso universal», y esa se
     * comprueba pidiendo al catalogo una tabla cualquiera que no se le haya
     * concedido.
     *
     * El denominador va incluido: si no quedara NINGUNA tabla sin conceder, el
     * rol tendria acceso a todo y esta prueba tiene que decirlo en vez de pasar
     * por no encontrar contraejemplo.
     */
    const { rows } = await siembra.query<{ tabla: string; total: string }>(
      `SELECT t.table_name AS tabla,
              (SELECT count(*) FROM information_schema.tables x
                WHERE x.table_schema = 'public' AND x.table_type = 'BASE TABLE') AS total
         FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND left(t.table_name, 5) <> 'cert_'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_privileges tp
             WHERE tp.table_schema = 'public'
               AND tp.table_name = t.table_name
               AND tp.grantee = 'nelvyon_web_app'
          )
        ORDER BY t.table_name
        LIMIT 1`,
    );

    expect(
      rows.length,
      "no queda ni una tabla sin conceder a nelvyon_web_app: el rol tiene acceso universal",
    ).toBe(1);

    const sinConceder = rows[0].tabla;
    await expect(
      pool.query(`SELECT * FROM ${sinConceder}`),
      `${sinConceder} no esta concedida y aun asi se pudo leer`,
    ).rejects.toThrow(/permission denied/i);
  });

  it("no puede vaciar una tabla aunque pueda borrar filas de ella", async () => {
    // TRUNCATE no pasa por RLS: saltaria el aislamiento entero de una sentencia.
    // Por eso no se concede, aunque DELETE si.
    await expect(comoWebApp(A, async (c) =>
      c.query("TRUNCATE cert_os_rls"))).rejects.toThrow();
  });
});
