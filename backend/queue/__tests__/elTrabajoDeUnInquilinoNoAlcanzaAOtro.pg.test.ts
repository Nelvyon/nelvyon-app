/**
 * SUITE ADVERSARIAL: UN TRABAJO NO ALCANZA LOS DATOS DE OTRO INQUILINO.
 *
 * Ya hay pruebas de que un trabajo SIN inquilino no se ejecuta
 * (`unTrabajoSinInquilinoNoSeVuelveGlobal`). Eso cubre la ausencia. Esto cubre
 * lo otro, que es peor: un trabajo CON inquilino que declara uno y toca los
 * datos de otro.
 *
 * La diferencia importa. Un trabajo sin inquilino se para en la puerta y se ve.
 * Un trabajo con el inquilino equivocado corre entero, escribe, y el sintoma lo
 * descubre el cliente cuyos datos aparecieron donde no debian.
 *
 * ── SE PRUEBA CONTRA POSTGRESQL DE VERDAD, Y NO ES OPCIONAL ─────────────────
 *
 * Lo que separa a A de B aqui son las POLITICAS de la base, no un `WHERE` del
 * codigo. Un doble de base no tiene politicas: aprobaria con el aislamiento
 * roto, que es la peor forma de aprobar.
 *
 * Las consultas se escriben a proposito SIN filtro de inquilino. Todo lo que
 * impida ver lo ajeno tiene que venir de la base.
 *
 * ── LOS ATAQUES ─────────────────────────────────────────────────────────────
 *
 *   inquilino ausente / nulo / vacio     ya cubiertos aparte; aqui el control
 *   inquilino falsificado                declarar el de otro sin pertenecer
 *   workspace ajeno                      pertenecer a uno y pedir el otro
 *   contexto contradictorio              usuario de A con workspace de B
 *   contexto heredado                    lo que dejo el trabajo anterior
 *   reintento                            un trabajo repetido no gana permisos
 *
 * COSTE EXTERNO: 0 EUR. Base local, datos sinteticos, se limpia al terminar.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  crearMesaDeCertificacion,
  FAMILIAS_REALES,
  sembrarSujetosReales,
  USUARIO_A,
  USUARIO_B,
  AJENO,
  WS_A,
  WS_B,
} from "../../db/__tests__/politicasRealesDeCertificacion";

const DSN_APP = process.env.NELVYON_WEB_APP_CERT_DSN;
const DSN_DUENO = process.env.NELVYON_WEB_CERT_DSN;
const describeSiHayRol = DSN_APP && DSN_DUENO ? describe : describe.skip;

const MESA = "cert_trabajo_ajeno";

let app: import("pg").Pool;
let dueno: import("pg").Pool;

/**
 * Ejecuta como lo haria el trabajador: una transaccion con el contexto fijado.
 *
 * Reproduce lo que hace `conInquilino` sin depender de el: si dependiera, un
 * fallo del trabajador se leeria como un fallo de aislamiento y al reves.
 */
async function comoUnTrabajo<T>(
  ctx: { usuario?: string | null; ws?: number | null },
  fn: (c: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const c = await app.connect();
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

const leerTodo = (c: import("pg").PoolClient) =>
  c.query<{ workspace_id: number; marca: string }>(`SELECT workspace_id, marca FROM ${MESA}`);

describeSiHayRol("un trabajo no alcanza los datos de otro inquilino", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    app = new Pool({ connectionString: DSN_APP, max: 2 });
    dueno = new Pool({ connectionString: DSN_DUENO, max: 2 });
    await crearMesaDeCertificacion(dueno, {
      tabla: MESA,
      familia: FAMILIAS_REALES.porWorkspaceOs,
      columnas: ["marca text"],
    });
    await sembrarSujetosReales(dueno);
  });

  afterAll(async () => {
    await app?.end();
    await dueno?.end();
  });

  beforeEach(async () => {
    await dueno.query(`TRUNCATE ${MESA}`);
    await dueno.query(
      `INSERT INTO ${MESA} (workspace_id, marca) VALUES ($1,'de-A'), ($2,'de-B')`,
      [WS_A, WS_B],
    );
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Los controles, primero: sin ellos nada de lo de abajo significa nada
  // ═════════════════════════════════════════════════════════════════════════

  it("EL CONTROL: el rol no es superusuario ni salta RLS", async () => {
    const { rows } = await app.query(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
    );
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolbypassrls).toBe(false);
  });

  it("EL CONTROL: con su inquilino, un trabajo SI ve lo suyo", async () => {
    // Sin esto, una configuracion que no dejara ver NADA a NADIE aprobaria
    // todos los ataques de abajo y no estaria aislando: solo rota.
    const filas = await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, leerTodo);
    expect(filas.rows).toHaveLength(1);
    expect(filas.rows[0].marca).toBe("de-A");
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Los ataques
  // ═════════════════════════════════════════════════════════════════════════

  it("INQUILINO FALSIFICADO: declarar el workspace de B sin pertenecer no sirve", async () => {
    /**
     * El ataque mas directo: un trabajo de A que se escribe a si mismo el
     * workspace de B. La politica exige DOS cosas —que la fila sea del
     * workspace del contexto Y que el usuario pertenezca a ese workspace—, asi
     * que declarar el numero no basta.
     */
    const filas = await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_B }, leerTodo);
    expect(filas.rows, "declarar el workspace ajeno dio acceso a sus datos").toHaveLength(0);
  });

  it("USUARIO AJENO: uno que no pertenece a ningun workspace no ve nada", async () => {
    for (const ws of [WS_A, WS_B]) {
      const filas = await comoUnTrabajo({ usuario: AJENO, ws }, leerTodo);
      expect(filas.rows, `un usuario ajeno vio los datos del workspace ${ws}`).toHaveLength(0);
    }
  });

  it("CONTEXTO CONTRADICTORIO: usuario de A con workspace de B, y al reves", async () => {
    expect((await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_B }, leerTodo)).rows).toHaveLength(0);
    expect((await comoUnTrabajo({ usuario: USUARIO_B, ws: WS_A }, leerTodo)).rows).toHaveLength(0);
  });

  it("CONTEXTO INCOMPLETO: falta el usuario, o falta el workspace", async () => {
    // La politica necesita los dos. Que uno solo bastara seria justo el agujero
    // que hace util al otro.
    expect((await comoUnTrabajo({ ws: WS_A }, leerTodo)).rows).toHaveLength(0);
    expect((await comoUnTrabajo({ usuario: USUARIO_A }, leerTodo)).rows).toHaveLength(0);
  });

  it("SIN NINGUN CONTEXTO: no se ve nada (fail-closed)", async () => {
    expect((await comoUnTrabajo({}, leerTodo)).rows).toHaveLength(0);
  });

  it("ESCRITURA CRUZADA: A no puede escribir en el workspace de B", async () => {
    await expect(
      comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, (c) =>
        c.query(`INSERT INTO ${MESA} (workspace_id, marca) VALUES ($1, 'colado')`, [WS_B]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("BORRADO SIN FILTRO: A borra lo suyo y NI UNA fila de B", async () => {
    /**
     * El `DELETE` va sin `WHERE` a proposito. Es la forma en que un trabajo mal
     * escrito destruye los datos de todos: si la politica no acota, se lleva la
     * tabla entera.
     */
    await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, (c) => c.query(`DELETE FROM ${MESA}`));
    const { rows } = await dueno.query<{ marca: string }>(`SELECT marca FROM ${MESA}`);
    expect(rows.map((r) => r.marca), "el borrado de A se llevo filas de B").toEqual(["de-B"]);
  });

  it("ACTUALIZACION SIN FILTRO: A toca lo suyo y NI UNA fila de B", async () => {
    await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, (c) =>
      c.query(`UPDATE ${MESA} SET marca = 'tocada'`),
    );
    const { rows } = await dueno.query<{ workspace_id: number; marca: string }>(
      `SELECT workspace_id, marca FROM ${MESA} ORDER BY workspace_id`,
    );
    expect(rows.find((r) => r.workspace_id === WS_B)?.marca, "A modifico una fila de B").toBe("de-B");
    expect(rows.find((r) => r.workspace_id === WS_A)?.marca).toBe("tocada");
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Lo que queda entre un trabajo y el siguiente
  // ═════════════════════════════════════════════════════════════════════════

  it("CONTEXTO HEREDADO: A → B → A sobre la MISMA conexion, sin contaminacion", async () => {
    /**
     * El trabajador reutiliza conexiones. Si el contexto de un trabajo
     * sobreviviera al siguiente, el segundo correria con los permisos del
     * primero — y el sintoma serian datos de un cliente en el entregable de
     * otro, sin ningun error por medio.
     *
     * `set_config(..., true)` es local a la transaccion, y esto lo certifica en
     * vez de suponerlo.
     */
    expect((await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, leerTodo)).rows[0].marca).toBe("de-A");
    expect((await comoUnTrabajo({ usuario: USUARIO_B, ws: WS_B }, leerTodo)).rows[0].marca).toBe("de-B");
    expect((await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, leerTodo)).rows[0].marca).toBe("de-A");
  });

  it("y el trabajo SIN contexto entre dos con contexto no hereda el de antes", async () => {
    await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, leerTodo);
    expect(
      (await comoUnTrabajo({}, leerTodo)).rows,
      "un trabajo sin contexto heredo el del anterior",
    ).toHaveLength(0);
    // Y el de despues sigue viendo lo suyo: limpiar no puede romper.
    expect((await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, leerTodo)).rows).toHaveLength(1);
  });

  it("UN ERROR a mitad no deja el contexto puesto para el siguiente", async () => {
    /**
     * Es el caso que mas se olvida: la transaccion revienta, la conexion vuelve
     * al pool, y si el contexto sobreviviera el siguiente trabajo empezaria con
     * los permisos del que fallo.
     */
    await expect(
      comoUnTrabajo({ usuario: USUARIO_A, ws: WS_A }, async (c) => {
        await c.query(`SELECT 1 FROM ${MESA}`);
        await c.query("SELECT 1/0");
      }),
    ).rejects.toThrow();
    expect((await comoUnTrabajo({}, leerTodo)).rows).toHaveLength(0);
  });

  it("REINTENTO: repetir el mismo trabajo no le da mas permisos", async () => {
    // Un trabajo que falla y se reintenta no puede ir acumulando acceso. Tres
    // vueltas con el workspace ajeno siguen sin ver nada.
    for (let vuelta = 1; vuelta <= 3; vuelta += 1) {
      const filas = await comoUnTrabajo({ usuario: USUARIO_A, ws: WS_B }, leerTodo);
      expect(filas.rows, `en la vuelta ${vuelta} el reintento gano acceso`).toHaveLength(0);
    }
  });
});
