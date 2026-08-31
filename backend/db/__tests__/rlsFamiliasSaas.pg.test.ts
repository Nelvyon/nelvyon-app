/**
 * Las CUATRO familias de política SaaS, con el rol real `nelvyon_web_app`.
 *
 * POR QUE CUATRO Y NO UNA TABLA REPRESENTATIVA
 * ---------------------------------------------
 * Las 1.763 políticas de producción se reducen a 46 formas distintas, y cinco de
 * ellas cubren el 91%. Sus semánticas NO son equivalentes, así que certificar una
 * «representativa» habría dejado tres sin comprobar:
 *
 *   804 pol · 201 tablas   user_id = nelvyon_jwt_user_id()
 *                          Aislamiento POR USUARIO, no por inquilino: dos
 *                          personas del mismo cliente no se ven entre sí.
 *
 *   512 pol · 136 tablas   tenant_id = nelvyon_current_saas_tenant_uuid()
 *                          El inquilino se DERIVA del usuario verificado
 *                          (`SELECT id FROM saas_tenants WHERE user_id = …`).
 *                          Declarar otro no sirve: no se lee de la sesión.
 *
 *    79 pol ·  36 tablas   workspace_id = current_tenant_id()
 *                          Comparación DIRECTA contra `app.tenant_id`. No
 *                          comprueba pertenencia. Ver la nota de abajo.
 *
 *    33 pol ·  33 tablas   tenant_id = nelvyon_erp_tenant_text()
 *                          Igual, en texto, para el espacio ERP.
 *
 *   208 pol ·  52 tablas   nelvyon_os_workspace_select/mutate(workspace_id)
 *                          Ya certificada en `rlsEfectivaWebApp.pg.test.ts`.
 *
 * LA DIFERENCIA QUE HAY QUE SABER, Y QUE ESTAS PRUEBAS HACEN VISIBLE
 * -------------------------------------------------------------------
 * Las familias OS exigen DOS cosas: que el id coincida Y que el usuario
 * pertenezca al workspace. Las familias `current_tenant_id()` y
 * `nelvyon_erp_tenant_text()` exigen sólo lo primero: se fían de
 * `app.tenant_id`.
 *
 * No es un agujero —esa variable la fija el servidor tras verificar, nunca el
 * cliente— pero sí una dependencia que conviene tener escrita: en esas 69 tablas,
 * el aislamiento descansa ENTERAMENTE en que la aplicación ponga bien el
 * contexto. En las familias OS y en la del uuid, aunque el contexto viniera mal,
 * la base seguiría negando.
 *
 * `test_declarar_un_inquilino_ajeno` de abajo lo demuestra en las dos
 * direcciones, para que la diferencia no sea una opinión.
 *
 * Se salta sin `NELVYON_WEB_APP_CERT_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN = process.env.NELVYON_WEB_APP_CERT_DSN;
const describeSiHayRol = DSN ? describe : describe.skip;

/**
 * Los sujetos vienen del modulo compartido y no se repiten aqui.
 *
 * Estaban duplicados en tres ficheros con los mismos valores, y las tres
 * suites siembran contra la MISMA base: en cuanto uno de los tres cambiara un
 * digito, las filas sembradas por una suite dejarian de coincidir con el
 * contexto de otra y el fallo se leeria como un fallo de aislamiento.
 */
import {
  AJENO,
  crearMesaDeCertificacion,
  FAMILIAS_REALES,
  sembrarSujetosReales,
  TENANT_A,
  TENANT_B,
  USUARIO_A,
  USUARIO_B,
  WS_A,
  WS_B,
  type PredicadosReales,
} from "./politicasRealesDeCertificacion";

let pool: import("pg").Pool;
let siembra: import("pg").Pool;
/** Los predicados leidos del catalogo para cada familia. */
const predicados = new Map<string, PredicadosReales>();

type Ctx = { sub?: string | null; tenantId?: string | number | null };

async function como<T>(ctx: Ctx, fn: (c: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    if (ctx.sub) await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ctx.sub]);
    if (ctx.tenantId != null) {
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [String(ctx.tenantId)]);
    }
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

/** Cada familia: su tabla, su columna de dueño, y el valor de A y de B. */
const FAMILIAS = [
  {
    nombre: "por usuario (804 politicas · 201 tablas)",
    tabla: "cert_por_usuario",
    // La clave de la familia en `politicasRealesDeCertificacion`: de ahi sale
    // el predicado real con el que se monta la mesa.
    familia: "porUsuario",
    columna: "user_id",
    valorA: USUARIO_A, valorB: USUARIO_B,
    ctxA: { sub: USUARIO_A } as Ctx,
    ctxB: { sub: USUARIO_B } as Ctx,
    // Declarar otro usuario NO es posible: `sub` viene del JWT firmado. Lo que se
    // simula aqui es un `sub` que no corresponde a ninguna fila.
    ctxFalso: { sub: AJENO } as Ctx,
    derivado: true,
  },
  {
    nombre: "por tenant uuid derivado (512 politicas · 136 tablas)",
    tabla: "cert_por_tenant_uuid",
    // La clave de la familia en `politicasRealesDeCertificacion`: de ahi sale
    // el predicado real con el que se monta la mesa.
    familia: "porTenantUuid",
    columna: "tenant_id",
    valorA: TENANT_A, valorB: TENANT_B,
    ctxA: { sub: USUARIO_A } as Ctx,
    ctxB: { sub: USUARIO_B } as Ctx,
    // El inquilino se deriva del usuario: no hay forma de declarar otro.
    ctxFalso: { sub: USUARIO_A, tenantId: TENANT_B } as Ctx,
    derivado: true,
  },
  {
    nombre: "por workspace directo (79 politicas · 36 tablas)",
    tabla: "cert_por_ws_directo",
    // La clave de la familia en `politicasRealesDeCertificacion`: de ahi sale
    // el predicado real con el que se monta la mesa.
    familia: "porWorkspaceDirecto",
    columna: "workspace_id",
    valorA: WS_A, valorB: WS_B,
    ctxA: { sub: USUARIO_A, tenantId: WS_A } as Ctx,
    ctxB: { sub: USUARIO_B, tenantId: WS_B } as Ctx,
    ctxFalso: { sub: USUARIO_A, tenantId: WS_B } as Ctx,
    derivado: false,   // se fia de la variable de sesion
  },
  {
    nombre: "por tenant texto ERP (33 politicas · 33 tablas)",
    tabla: "cert_por_erp_text",
    // La clave de la familia en `politicasRealesDeCertificacion`: de ahi sale
    // el predicado real con el que se monta la mesa.
    familia: "porErpTexto",
    columna: "tenant_id",
    valorA: "erp-A", valorB: "erp-B",
    ctxA: { sub: USUARIO_A, tenantId: "erp-A" } as Ctx,
    ctxB: { sub: USUARIO_B, tenantId: "erp-B" } as Ctx,
    ctxFalso: { sub: USUARIO_A, tenantId: "erp-B" } as Ctx,
    derivado: false,
  },
] as const;

describeSiHayRol("familias de politica SaaS con nelvyon_web_app", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 1 });        // misma conexion fisica
    siembra = new Pool({ connectionString: process.env.NELVYON_WEB_CERT_DSN, max: 2 });

    /**
     * LAS CUATRO MESAS SE MONTAN SOLAS, CON LAS POLITICAS DE VERDAD.
     *
     * Ninguna de las cuatro existia en el arbol: se crearon a mano en alguna
     * base local, asi que esta certificacion —47 pruebas sobre las cuatro
     * familias de politica que cubren casi todo el esquema— dependia de objetos
     * que nadie podia reconstruir leyendo el repositorio.
     *
     * Los predicados NO se escriben aqui. `crearMesaDeCertificacion` los lee de
     * `pg_policies` y los aplica tal cual, eligiendo para cada familia el que
     * mas tablas reales cubre y exigiendo un minimo. Escribir una version
     * «equivalente» certificaria esa version, no la que decide.
     */
    for (const f of FAMILIAS) {
      predicados.set(
        f.tabla,
        await crearMesaDeCertificacion(siembra, {
          tabla: f.tabla,
          familia: FAMILIAS_REALES[f.familia],
          columnas: ["marca text"],
        }),
      );
    }
    await sembrarSujetosReales(siembra);
  });

  it("las cuatro mesas llevan la politica REAL, no una simplificacion", () => {
    /**
     * EL GUARDIAN DE LA DERIVACION. Si la busqueda dejara de encontrar una
     * familia y cayera en cualquier otro predicado, las 47 pruebas de abajo
     * seguirian pasando —aislarian igual— mientras certifican una politica que
     * el producto no usa. Aqui se comprueba que cada mesa lleva la funcion de
     * su familia y que esa familia cubre de verdad muchas tablas.
     */
    for (const f of FAMILIAS) {
      const p = predicados.get(f.tabla)!;
      const familia = FAMILIAS_REALES[f.familia];
      expect(p.seleccionar, `${f.tabla} no usa ${familia.marcador}`).toContain(familia.marcador);
      expect(
        p.tablas,
        `la familia «${familia.nombre}» apenas cubre tablas: se estaria midiendo una excepcion`,
      ).toBeGreaterThanOrEqual(familia.minimoTablas);
    }
  });

  afterAll(async () => { await pool?.end(); await siembra?.end(); });

  beforeEach(async () => {
    for (const f of FAMILIAS) {
      await siembra.query(`TRUNCATE ${f.tabla}`);
      await siembra.query(
        `INSERT INTO ${f.tabla} (${f.columna}, marca) VALUES ($1,$3), ($2,$4)`,
        [f.valorA, f.valorB, "fila-de-A", "fila-de-B"]);
    }
  });

  it("el rol sigue sin ser superusuario ni saltar RLS", async () => {
    const { rows } = await pool.query(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user");
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolbypassrls).toBe(false);
  });

  describe.each(FAMILIAS)("$nombre", (f) => {
    const leer = async (ctx: Ctx) =>
      como(ctx, async (c) => (await c.query(`SELECT marca FROM ${f.tabla}`)).rows);

    it("SELECT · A ve lo suyo (control positivo)", async () => {
      const filas = await leer(f.ctxA);
      expect(filas).toHaveLength(1);
      expect(filas[0].marca).toBe("fila-de-A");
    });

    it("SELECT · A no ve lo de B", async () => {
      expect((await leer(f.ctxA)).some((r) => r.marca === "fila-de-B")).toBe(false);
    });

    it("SELECT · B ve lo suyo (control positivo del otro lado)", async () => {
      const filas = await leer(f.ctxB);
      expect(filas).toHaveLength(1);
      expect(filas[0].marca).toBe("fila-de-B");
    });

    it("SELECT · B no ve lo de A", async () => {
      expect((await leer(f.ctxB)).some((r) => r.marca === "fila-de-A")).toBe(false);
    });

    it("SELECT · sin contexto, nada", async () => {
      expect(await leer({})).toHaveLength(0);
    });

    it("INSERT · A escribe lo suyo y NO lo de B", async () => {
      await como(f.ctxA, async (c) =>
        c.query(`INSERT INTO ${f.tabla} (${f.columna}, marca) VALUES ($1,'nueva-de-A')`,
                [f.valorA]));                                   // control positivo
      await expect(como(f.ctxA, async (c) =>
        c.query(`INSERT INTO ${f.tabla} (${f.columna}, marca) VALUES ($1,'colada')`,
                [f.valorB]))).rejects.toThrow(/row-level security/i);
    });

    it("UPDATE · sin filtro, A solo toca lo suyo", async () => {
      const r = await como(f.ctxA, async (c) =>
        c.query(`UPDATE ${f.tabla} SET marca = 'tocado-por-A'`));
      expect(r.rowCount).toBe(1);                               // control positivo
      const deB = await siembra.query(
        `SELECT count(*)::int n FROM ${f.tabla} WHERE marca = 'tocado-por-A' AND ${f.columna}::text = $1`,
        [String(f.valorB)]);
      expect(deB.rows[0].n).toBe(0);
    });

    it("DELETE · sin filtro, A solo borra lo suyo", async () => {
      const r = await como(f.ctxA, async (c) => c.query(`DELETE FROM ${f.tabla}`));
      expect(r.rowCount).toBe(1);
      const quedan = await siembra.query(
        `SELECT count(*)::int n FROM ${f.tabla} WHERE ${f.columna}::text = $1`,
        [String(f.valorB)]);
      expect(quedan.rows[0].n).toBe(1);
    });

    it("un sujeto que no existe no ve nada", async () => {
      expect(await leer({ sub: AJENO })).toHaveLength(0);
    });

    it("A -> B -> A sobre la MISMA conexion, sin contaminacion", async () => {
      const a1 = await leer(f.ctxA);
      const b = await leer(f.ctxB);
      const a2 = await leer(f.ctxA);
      expect(a1[0].marca).toBe("fila-de-A");
      expect(b[0].marca).toBe("fila-de-B");
      expect(a2[0].marca).toBe("fila-de-A");
    });

    it("A -> sin contexto -> A: la del medio no hereda, la ultima sigue viendo", async () => {
      await leer(f.ctxA);
      expect(await leer({})).toHaveLength(0);
      expect(await leer(f.ctxA)).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // La diferencia entre familias, demostrada en vez de afirmada
  // ═══════════════════════════════════════════════════════════════════════════

  it("declarar el inquilino de B: las familias DERIVADAS lo ignoran", async () => {
    // En estas dos el inquilino sale del usuario verificado, asi que poner otro
    // valor en la sesion no cambia nada: se sigue viendo lo propio.
    for (const f of FAMILIAS.filter((x) => x.derivado)) {
      const filas = await como(f.ctxFalso, async (c) =>
        (await c.query(`SELECT marca FROM ${f.tabla}`)).rows);
      expect(filas.map((r) => r.marca)).not.toContain("fila-de-B");
    }
  });

  it("declarar el inquilino de B: las familias DIRECTAS se fian de la variable", async () => {
    // LA PRUEBA QUE HACE VISIBLE LA DEPENDENCIA. En estas 69 tablas la base NO
    // comprueba pertenencia: si la aplicacion pusiera un `app.tenant_id` que no
    // corresponde al usuario, se veria lo de otro.
    //
    // No es explotable desde fuera —esa variable la fija el servidor despues de
    // verificar, y `test_las_rutas_web_fijan_el_inquilino` comprueba que asi
    // sea— pero significa que en estas tablas el aislamiento descansa ENTERAMENTE
    // en la aplicacion, mientras que en las otras la base es una segunda red.
    //
    // Se deja escrito y comprobado para que la diferencia sea un hecho conocido
    // y no una sorpresa el dia que alguien toque el codigo del contexto.
    for (const f of FAMILIAS.filter((x) => !x.derivado)) {
      const filas = await como(f.ctxFalso, async (c) =>
        (await c.query(`SELECT marca FROM ${f.tabla}`)).rows);
      expect(filas.map((r) => r.marca)).toContain("fila-de-B");
    }
  });
});
