/**
 * El cutover del rol del lado web, medido de punta a punta.
 *
 * QUÉ PREGUNTA CONTESTA ESTA SUITE
 * ================================
 * `rlsEfectivaWebApp.pg.test.ts` ya certifica que con `nelvyon_web_app` y
 * contexto de inquilino el aislamiento funciona: 21 pruebas. `rlsFamiliasSaas`
 * añade 14 más.
 *
 * Lo que ninguna de las dos mira es el otro lado del cambio: **qué le pasa al
 * trabajo que NO tiene inquilino**. Y eso no es un caso raro. Son 60 rutas
 * —medidas, no estimadas— que consultan la base sin fijar contexto porque
 * trabajan entre inquilinos por definición: los 14 crons, los 6 webhooks, el
 * plano `platform`, el plano `admin`, las superficies públicas. Están
 * inventariadas una a una con su motivo en
 * `test_las_rutas_web_fijan_el_inquilino.py`.
 *
 * Hoy no se nota, porque el rol de producción es superusuario y ninguna política
 * se evalúa. El día del cutover sí se notaría, y la forma de notarlo es la peor
 * posible: **no dan error, devuelven cero filas**. Un cron que no encuentra
 * trabajo, un webhook que no encuentra al inquilino del cuerpo firmado y un
 * panel de plataforma vacío se parecen mucho a «no había nada que hacer».
 *
 * Aquí se demuestra las tres cosas, contra PostgreSQL real:
 *
 *   1. El peligro es real: mismo SQL, mismo dato, sin contexto → CERO filas, y
 *      sin un solo error.
 *   2. `nelvyon_web_jobs` lo resuelve: el mismo SQL ve las filas de todos.
 *   3. Y esa conexión no se puede usar desde una petición con inquilino.
 *
 * POR QUÉ IMPORTA EL ORDEN
 * ------------------------
 * La 1 es la que justifica que exista la 2. Sin medirla, `DbJobsClient` sería
 * una conexión privilegiada añadida «por si acaso» — y una conexión que salta
 * RLS que nadie ha demostrado que haga falta es exactamente lo que no se debe
 * añadir.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DSN_APP = process.env.NELVYON_WEB_APP_CERT_DSN ?? "";
const DSN_JOBS = process.env.NELVYON_WEB_JOBS_CERT_DSN ?? "";
const DSN_DUENO = process.env.NELVYON_WEB_CERT_DSN ?? "";
const hayRoles = Boolean(DSN_APP && DSN_JOBS && DSN_DUENO);
const conRoles = hayRoles ? describe : describe.skip;

const WS_A = 910001;
const WS_B = 910002;
const USUARIO_A = "aaaaaaaa-0001-4001-8001-000000000001";
const USUARIO_B = "bbbbbbbb-0002-4002-8002-000000000002";

let app: import("pg").Pool;
let jobs: import("pg").Pool;
let dueno: import("pg").Pool;

/** El SQL que escribiría un cron: sin `WHERE` de inquilino, a propósito. */
const SQL_DE_CRON = `SELECT workspace_id, status FROM cert_os_rls ORDER BY workspace_id, status`;

conRoles("el cutover del rol del lado web (PostgreSQL real)", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    app = new Pool({ connectionString: DSN_APP, max: 2 });
    jobs = new Pool({ connectionString: DSN_JOBS, max: 2 });
    dueno = new Pool({ connectionString: DSN_DUENO, max: 2 });
  });

  afterAll(async () => {
    await app?.end();
    await jobs?.end();
    await dueno?.end();
  });

  beforeEach(async () => {
    // La pertenencia, primero. La política no es «declara un workspace y lo
    // ves»: `nelvyon_user_in_workspace` exige que el sujeto del JWT sea dueño
    // del workspace o miembro de él. Sin estas filas, el control positivo da
    // cero y toda la suite pasaría por la razón equivocada — pasó en la primera
    // ejecución, y por eso el control está escrito.
    for (const [ws, duenoDeWs] of [[WS_A, USUARIO_A], [WS_B, USUARIO_B]] as const) {
      await dueno.query(
        `INSERT INTO workspaces (id, user_id, name) VALUES ($1,$2,$3)
         ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [ws, duenoDeWs, `cert-cutover-${ws}`],
      );
    }
    await dueno.query("TRUNCATE cert_os_rls");
    for (const ws of [WS_A, WS_B]) {
      await dueno.query(
        `INSERT INTO cert_os_rls (channel, workspace_id, status, content_preview)
         VALUES ('landing',$1,'blocked',$2), ('email',$1,'passed',$2)`,
        [ws, `fila-del-workspace-${ws}`],
      );
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Los controles. Sin ellos, todo lo de abajo puede pasar por otra razón.
  // ═════════════════════════════════════════════════════════════════════════

  it("EL CONTROL · los dos roles son los que dicen ser", async () => {
    /**
     * Si `nelvyon_web_app` saltara RLS, la prueba del peligro daría cuatro filas
     * y parecería que no hay problema. Si `nelvyon_web_jobs` NO lo saltara, la
     * de la solución daría cero y parecería que la solución no sirve. Las dos
     * mentirían en la dirección cómoda.
     */
    const a = await app.query<{ u: string; s: boolean; b: boolean }>(
      `SELECT current_user AS u, rolsuper AS s, rolbypassrls AS b
         FROM pg_roles WHERE rolname = current_user`,
    );
    expect(a.rows[0]?.u).toBe("nelvyon_web_app");
    expect(a.rows[0]?.s, "nelvyon_web_app es superusuario").toBe(false);
    expect(a.rows[0]?.b, "nelvyon_web_app salta RLS: no serviría de nada").toBe(false);

    const j = await jobs.query<{ u: string; s: boolean; b: boolean }>(
      `SELECT current_user AS u, rolsuper AS s, rolbypassrls AS b
         FROM pg_roles WHERE rolname = current_user`,
    );
    expect(j.rows[0]?.u).toBe("nelvyon_web_jobs");
    expect(j.rows[0]?.s, "nelvyon_web_jobs es superusuario").toBe(false);
    expect(j.rows[0]?.b, "nelvyon_web_jobs no salta RLS: los crons no verían nada").toBe(true);
  });

  it("EL CONTROL · la tabla tiene RLS y tiene datos de dos inquilinos", async () => {
    // Sin RLS activa, «cero filas sin contexto» sería falso y toda la suite
    // estaría midiendo una tabla desprotegida.
    const r = await dueno.query<{ rls: boolean; n: string }>(
      `SELECT (SELECT rowsecurity FROM pg_tables
                WHERE schemaname='public' AND tablename='cert_os_rls') AS rls,
              (SELECT count(*)::text FROM cert_os_rls) AS n`,
    );
    expect(r.rows[0]?.rls, "cert_os_rls no tiene RLS: la suite no probaría nada").toBe(true);
    expect(Number(r.rows[0]?.n)).toBe(4);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 1 · El peligro, medido
  // ═════════════════════════════════════════════════════════════════════════

  it("con el rol acotado y SIN contexto, el SQL de un cron devuelve CERO filas y NO da error", async () => {
    /**
     * Ésta es la prueba que justifica todo lo demás.
     *
     * No es «falla el cron». Es peor: **no falla**. Devuelve una lista vacía, y
     * una lista vacía es una respuesta perfectamente normal para un barrido
     * nocturno. El fallo no aparecería en ninguna alerta de errores.
     */
    const r = await app.query(SQL_DE_CRON);
    expect(r.rowCount, "sin contexto se vieron filas: ¿la tabla perdió RLS?").toBe(0);
    // Y explícitamente: no hubo excepción. Si la hubiera, la línea de arriba no
    // se habría ejecutado.
    expect(r.command).toBe("SELECT");
  });

  it("con el rol acotado y CONTEXTO, ve lo suyo y solo lo suyo (control positivo)", async () => {
    // El contraste que impide leer lo de arriba como «el rol no ve nada nunca».
    const c = await app.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [USUARIO_A]);
      await c.query("SELECT set_config('app.workspace_id', $1, true)", [String(WS_A)]);
      const r = await c.query<{ workspace_id: number }>(SQL_DE_CRON);
      await c.query("COMMIT");
      expect(r.rowCount, "con contexto tampoco ve lo suyo: el contexto no llega").toBe(2);
      expect(new Set(r.rows.map((x) => Number(x.workspace_id)))).toEqual(new Set([WS_A]));
    } finally {
      c.release();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 2 · La solución, medida
  // ═════════════════════════════════════════════════════════════════════════

  it("con `nelvyon_web_jobs` el MISMO SQL ve las filas de todos los inquilinos", async () => {
    const r = await jobs.query<{ workspace_id: number }>(SQL_DE_CRON);
    expect(r.rowCount, "el rol de trabajos tampoco ve nada: el cutover rompería los crons").toBe(4);
    expect(new Set(r.rows.map((x) => Number(x.workspace_id)))).toEqual(new Set([WS_A, WS_B]));
  });

  it("y sigue sin ser administrador: no puede crear objetos ni vaciar tablas", async () => {
    /**
     * Que salte RLS no lo convierte en el superusuario que se quiere retirar.
     * Es la diferencia entre «puede leer entre inquilinos» y «puede hacer
     * cualquier cosa», y si no se comprueba, el cutover sería mudar el
     * superusuario de sitio y hacerlo más difícil de ver.
     */
    await expect(jobs.query("CREATE TABLE cert_intruso (id int)")).rejects.toThrow();
    await expect(jobs.query("TRUNCATE cert_os_rls")).rejects.toThrow();
    // Y las filas siguen ahí después de los dos intentos.
    const r = await dueno.query<{ n: string }>(`SELECT count(*)::text AS n FROM cert_os_rls`);
    expect(Number(r.rows[0]?.n)).toBe(4);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 3 · La vuelta atrás
  // ═════════════════════════════════════════════════════════════════════════

  it("volver al rol de antes restaura el comportamiento de hoy", async () => {
    /**
     * El rollback del cutover es devolver `DATABASE_URL` al rol anterior. No hay
     * nada que deshacer en el esquema: la migración 577 sólo crea roles y
     * concede permisos, y ninguna de las dos cosas cambia lo que ve el rol
     * antiguo.
     *
     * Se demuestra con el rol dueño, que es el que hace de «antes».
     */
    const r = await dueno.query(SQL_DE_CRON);
    expect(r.rowCount, "el rol de antes ya no ve las filas: el rollback no sería rollback").toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// La tercera defensa de `DbJobsClient`, que no depende del rol
// ═══════════════════════════════════════════════════════════════════════════

describe("`DbJobsClient` se niega a trabajar dentro de una petición con inquilino", () => {
  /**
   * Las otras dos defensas —que `DbClient` no lea la variable y que nadie más
   * construya pools— impiden que una ruta normal ALCANCE la conexión. Ésta
   * impide que le sirva de algo si la alcanza.
   *
   * No hace falta base: lo que se comprueba es que lanza ANTES de consultar.
   * Que lance antes es justo lo que se quiere — si primero consultara y luego
   * comprobara, ya habría leído datos de otros inquilinos.
   */
  it("EL CONTROL · sin inquilino en el contexto, NO se niega por ese motivo", async () => {
    /**
     * Sin este control, un cliente que se negara SIEMPRE pasaría las tres
     * pruebas de abajo y dejaría sin funcionar los 14 crons y los 6 webhooks.
     *
     * Se afirma sobre el MOTIVO y no sobre si hay error: con una base real
     * detrás la consulta funciona, y con una inventada falla por conexión. Las
     * dos cosas son aceptables; lo que no lo es es que se niegue por contexto.
     * Escrito con `rejects`, este control fallaba justo cuando la conexión iba
     * bien — un rojo por acertar.
     */
    const { conInquilino } = await import("../contextoDeInquilino");
    const { DbJobsClient, reiniciarClienteDeTrabajosParaPruebas } = await import("../DbJobsClient");
    reiniciarClienteDeTrabajosParaPruebas();
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? "postgresql://noop:noop@127.0.0.1:1/noop";

    await conInquilino({}, async () => {
      let motivo = "";
      try {
        await DbJobsClient.getInstance().query("SELECT 1");
      } catch (e) {
        motivo = e instanceof Error ? e.message : String(e);
      }
      expect(motivo, "se negó a trabajar sin haber ningún inquilino").not.toMatch(
        /hay un inquilino en el contexto/,
      );
    });
    await DbJobsClient.getInstance().end().catch(() => {});
  });

  it("con `tenantId` en el contexto, LANZA y no consulta", async () => {
    const { conInquilino } = await import("../contextoDeInquilino");
    const { DbJobsClient, reiniciarClienteDeTrabajosParaPruebas } = await import("../DbJobsClient");
    reiniciarClienteDeTrabajosParaPruebas();

    await conInquilino({ tenantId: "11111111-1111-4111-8111-111111111111" }, async () => {
      await expect(DbJobsClient.getInstance().query("SELECT 1")).rejects.toThrow(
        /hay un inquilino en el contexto/,
      );
      await expect(DbJobsClient.getInstance().withTransaction(async () => 1)).rejects.toThrow(
        /hay un inquilino en el contexto/,
      );
    });
    await DbJobsClient.getInstance().end().catch(() => {});
  });

  it("con `workspaceId` o con `userId` también lanza", async () => {
    // Las tres formas de que haya alguien concreto detrás de la petición.
    const { conInquilino } = await import("../contextoDeInquilino");
    const { DbJobsClient, reiniciarClienteDeTrabajosParaPruebas } = await import("../DbJobsClient");

    for (const ctx of [{ workspaceId: 42 }, { userId: "u-1" }]) {
      reiniciarClienteDeTrabajosParaPruebas();
      await conInquilino(ctx, async () => {
        await expect(
          DbJobsClient.getInstance().query("SELECT 1"),
          JSON.stringify(ctx),
        ).rejects.toThrow(/hay un inquilino en el contexto/);
      });
      await DbJobsClient.getInstance().end().catch(() => {});
    }
  });

  it("mientras la variable no exista, cae a `DATABASE_URL`: cero cambio de conducta", async () => {
    /**
     * Es lo que hace este fichero desplegable ANTES del cutover. Si no cayera,
     * añadirlo obligaría a poner las dos cosas a la vez, y un cambio que exige
     * dos movimientos simultáneos es un cambio que no se puede revertir a
     * medias.
     */
    /**
     * Con `vi.stubEnv` y NO capturando el valor previo a mano.
     *
     * Guardar `const previo = process.env.X` y devolverlo en un `finally` es el
     * patrón que `test_tests_no_capturan_env_al_cargar.py` vigila, y lo cazó
     * sobre este mismo fichero. La objeción es real aunque aquí la captura
     * estuviera dentro del `it`: vitest reparte varios ficheros por *worker* y
     * comparte el proceso, así que «lo que había antes» puede ser lo que dejó
     * otro fichero, y restaurarlo es propagar su estado en vez de deshacer el
     * propio.
     *
     * `unstubAllEnvs` no restaura un valor leído: deshace exactamente los
     * `stubEnv` de esta prueba. Es la diferencia entre revertir lo que hice y
     * reponer lo que creía que había.
     */
    const { cadenaDeTrabajos } = await import("../DbJobsClient");
    try {
      vi.stubEnv("NELVYON_WEB_JOBS_DATABASE_URL", "");
      vi.stubEnv("DATABASE_URL", "postgresql://a:b@127.0.0.1:5432/normal");
      expect(cadenaDeTrabajos()).toEqual({
        url: "postgresql://a:b@127.0.0.1:5432/normal",
        separada: false,
      });

      vi.stubEnv("NELVYON_WEB_JOBS_DATABASE_URL", "postgresql://c:d@127.0.0.1:5432/trabajos");
      expect(cadenaDeTrabajos()).toEqual({
        url: "postgresql://c:d@127.0.0.1:5432/trabajos",
        separada: true,
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
