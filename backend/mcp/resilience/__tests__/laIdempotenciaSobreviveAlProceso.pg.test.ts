/**
 * BLOQUE 6 · la idempotencia del MCP sobrevive al proceso.
 *
 * `IdempotencyStore` era un `Map` en memoria. Su propia cabecera lo admitia:
 * «survives within process». Con eso, dos cosas rompen la garantia sin que haga
 * falta nada raro:
 *
 *   - **Dos instancias.** Cada una tiene su Map. La misma clave llega a la que
 *     no la ha visto y la herramienta se ejecuta por segunda vez.
 *   - **Un reinicio.** El Map se vacia. El reintento del cliente —que es lo
 *     normal ante un timeout— ejecuta otra vez.
 *
 * Es exactamente el defecto que el Bloque 4 corrigio en los webhooks
 * entrantes: «idempotente dentro de un proceso» no es idempotente, porque quien
 * reintenta lo hace contra el balanceador y no contra un proceso concreto.
 *
 * La garantia la da PostgreSQL con `erp_idempotency_keys`, que ya existe y cuya
 * forma es generica —inquilino, dominio y clave—. Sin migracion nueva: un
 * `INSERT ... ON CONFLICT DO NOTHING RETURNING` resuelve la carrera en la base,
 * que es donde se puede resolver de verdad.
 *
 * Estas pruebas van contra PostgreSQL REAL a proposito. Un doble en memoria
 * probaria mi doble, no la restriccion de unicidad, y la restriccion es
 * justamente lo que sostiene la propiedad.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { reclamarEjecucionMcp, resetIdempotencyForTests } from "../IdempotencyStore";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ??
  process.env.DATABASE_URL ??
  process.env.NELVYON_B2_DSN ??
  "";

const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

let pool: import("pg").Pool;

beforeAll(async () => {
  if (!hayBase) return;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });
});

afterAll(async () => {
  if (pool) await pool.end();
});

beforeEach(async () => {
  resetIdempotencyForTests();
  if (pool) {
    await pool.query(`DELETE FROM erp_idempotency_keys WHERE tenant_id LIKE 'b6-%'`);
  }
});

const db = {
  query: async <T,>(sql: string, params?: unknown[]): Promise<T[]> => {
    const r = await pool.query(sql, params as never[]);
    return r.rows as T[];
  },
};

soloConBase("BLOQUE 6 · la misma clave no se ejecuta dos veces", () => {
  it("EL CONTROL: dos claves distintas se ejecutan las dos", async () => {
    // Sin esto, una idempotencia que dijera «duplicado» a todo pasaria las
    // pruebas de abajo y dejaria al producto sin ejecutar nada.
    expect(await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "clave-A")).toBe(true);
    expect(await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "clave-B")).toBe(true);
  });

  it("la segunda vez que llega la misma clave se rechaza", async () => {
    expect(await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "repetida")).toBe(true);
    expect(
      await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "repetida"),
      "la misma clave se ejecuto dos veces",
    ).toBe(false);
  });

  it("sobrevive a que el proceso se reinicie", async () => {
    /**
     * El reinicio se simula vaciando la memoria del proceso, que es
     * literalmente lo que pasa al reiniciar. Si la garantia viviera en el Map,
     * aqui volveria a decir «primera vez» y la herramienta se ejecutaria otra
     * vez con la misma clave.
     */
    expect(await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "tras-reinicio")).toBe(true);

    resetIdempotencyForTests(); // el proceso se reinicia

    expect(
      await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "tras-reinicio"),
      "un reinicio borro la idempotencia y la herramienta se ejecutaria otra vez",
    ).toBe(false);
  });

  it("dos instancias a la vez: solo una gana", async () => {
    /**
     * La prueba que no se puede hacer con un doble. Doce reclamaciones
     * concurrentes de la misma clave contra la MISMA base: la restriccion de
     * unicidad tiene que dejar pasar exactamente una.
     *
     * La invariante no depende de como se planifiquen las promesas: **las
     * concesiones tienen que ser una**, y las filas creadas tambien.
     */
    const intentos = await Promise.all(
      Array.from({ length: 12 }, () => reclamarEjecucionMcp(db, "b6-t2", "pagos.cobrar", "carrera")),
    );
    const concedidas = intentos.filter(Boolean).length;

    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM erp_idempotency_keys
        WHERE tenant_id = 'b6-t2' AND idem_key = 'carrera'`,
    );

    expect(concedidas, `${concedidas} instancias creyeron que les tocaba`).toBe(1);
    expect(rows[0].n, "las filas creadas no coinciden con las concesiones").toBe(1);
  });

  it("cada inquilino tiene su propio espacio de claves", async () => {
    // Si la clave no llevara el inquilino, el trabajo de un cliente bloquearia
    // el de otro: un fallo de aislamiento disfrazado de idempotencia.
    expect(await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "compartida")).toBe(true);
    expect(
      await reclamarEjecucionMcp(db, "b6-t2", "crm.create", "compartida"),
      "la clave de un inquilino bloqueo la de otro",
    ).toBe(true);
  });

  it("cada herramienta tiene su propio espacio de claves", async () => {
    expect(await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "misma")).toBe(true);
    expect(
      await reclamarEjecucionMcp(db, "b6-t1", "pagos.cobrar", "misma"),
      "la clave de una herramienta bloqueo la de otra distinta",
    ).toBe(true);
  });

  it("sin clave se deja pasar, no se descarta en silencio", async () => {
    // Descartar algo sin clave seria perder trabajo sin decirlo. Es preferible
    // ejecutarlo: quien no manda clave no esta pidiendo deduplicacion.
    expect(await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "")).toBe(true);
    expect(await reclamarEjecucionMcp(db, "b6-t1", "crm.create", "   ")).toBe(true);
  });
});

soloConBase("BLOQUE 6 · la garantia tiene quien la llame", () => {
  it("el servidor MCP rechaza la segunda llamada con la misma clave", async () => {
    /**
     * La prueba que impide que esto acabe como el `leaseUntil` del orquestador:
     * mecanismo correcto, escrito, y sin nadie que lo invoque.
     *
     * Todo lo de arriba comprueba que `reclamarEjecucionMcp` FUNCIONA. Esto
     * comprueba que el servidor la USA — y ademas, que la usa contra una base
     * de verdad y no contra su Map, porque entre las dos llamadas se vacia la
     * memoria del proceso.
     */
    const { getMcpProductiveServer, resetMcpProductiveServerForTests } = await import(
      "../../server/McpProductiveServer"
    );
    // El flag corta ANTES de la idempotencia, y hace bien: una funcion
    // desactivada no debe quemar claves. Para medir la idempotencia hay que
    // encenderla.
    process.env.NELVYON_MCP_PRODUCTIVE_ENABLED = "1";
    resetMcpProductiveServerForTests();

    const servidor = getMcpProductiveServer(db);
    // Una herramienta que EXISTE: con una desconocida la reclamacion se
    // libera —y hace bien, porque no se ejecuto nada— asi que no habria
    // duplicado que medir.
    const peticion = {
      toolName: "health_check",
      args: {},
      ctx: {
        tenantId: "b6-t3",
        userId: "u1",
        agentId: "a1",
        requestId: "r1",
        traceId: "tr1",
        roles: ["admin"],
        scopes: ["crm:write"],
        idempotencyKey: "clave-del-servidor",
      },
    };

    const primera = await servidor.invoke(peticion as never);

    // El proceso se reinicia: el cache en memoria desaparece. Si la garantia
    // viviera ahi, la segunda llamada volveria a ejecutar la herramienta.
    resetIdempotencyForTests();

    const segunda = await servidor.invoke(peticion as never);

    expect(
      segunda.errorCode,
      `la segunda llamada con la misma clave no se rechazo (primera: ${primera.decision}/${primera.errorCode ?? "ok"})`,
    ).toBe("idempotent_duplicate");
    expect(segunda.ok).toBe(false);
  });
});

soloConBase("BLOQUE 6 · una denegacion previa no quema la clave", () => {
  it("tras un `unknown_tool` el cliente puede reintentar con la misma clave", async () => {
    /**
     * Lo destapo una mutacion: la primera llamada salio `denied/unknown_tool`
     * —una herramienta que no existe— y aun asi **quemo la clave**. El cliente
     * corrige el nombre, reintenta con la misma clave de idempotencia, y se le
     * responde «duplicado» por una operacion que no llego a ejecutarse jamas.
     *
     * La regla que separa los dos casos es si pudo haber efecto:
     *
     *   - Denegaciones ANTES de ejecutar —limite, circuito abierto, herramienta
     *     desconocida, politica— no tocaron nada. La clave se suelta: reintentar
     *     es seguro y hay que permitirlo.
     *   - Fallo DURANTE la ejecucion: el efecto pudo producirse. La clave se
     *     mantiene. Es preferible que el cliente reciba «duplicado» a producir
     *     un cobro dos veces.
     *
     * Ante la duda, no soltar. Un reintento imposible es un fastidio; un efecto
     * duplicado es un problema.
     */
    process.env.NELVYON_MCP_PRODUCTIVE_ENABLED = "1";
    const { getMcpProductiveServer, resetMcpProductiveServerForTests } = await import(
      "../../server/McpProductiveServer"
    );
    resetMcpProductiveServerForTests();
    const servidor = getMcpProductiveServer(db);

    const ctx = {
      tenantId: "b6-t4",
      userId: "u1",
      agentId: "a1",
      requestId: "r1",
      traceId: "tr1",
      roles: ["admin"],
      scopes: ["crm:write"],
      idempotencyKey: "clave-reutilizable",
    };

    const fallida = await servidor.invoke({
      toolName: "herramienta.que.no.existe",
      args: {},
      ctx,
    } as never);
    expect(fallida.errorCode).toBe("unknown_tool");

    resetIdempotencyForTests(); // no vale el cache: se mide la garantia

    const reintento = await servidor.invoke({
      toolName: "herramienta.que.no.existe",
      args: {},
      ctx,
    } as never);

    expect(
      reintento.errorCode,
      "una denegacion que no ejecuto nada dejo la clave quemada: el cliente no puede reintentar",
    ).not.toBe("idempotent_duplicate");
  });
});

soloConBase("BLOQUE 6 · un fallo DURANTE la ejecucion no suelta la clave", () => {
  it("tras un fallo de la herramienta, el reintento con la misma clave se rechaza", async () => {
    /**
     * La otra mitad de la regla, y la que faltaba: una mutacion que soltaba la
     * clave TAMBIEN tras fallar la ejecucion pasaba todas las pruebas. O sea
     * que la parte conservadora no estaba protegida por nada.
     *
     * Y es la mitad peligrosa. Cuando una herramienta falla a mitad, no se sabe
     * si el efecto llego a producirse: un cobro que devolvio timeout puede
     * haberse cursado igual. Soltar la clave ahi invita al cliente a reintentar
     * y a cobrarle dos veces.
     *
     * `docs_read` con una ruta que no existe entra en el manejador y lanza:
     * llega a ejecutarse, que es justo la condicion que se quiere distinguir de
     * una denegacion previa.
     */
    process.env.NELVYON_MCP_PRODUCTIVE_ENABLED = "1";
    const { getMcpProductiveServer, resetMcpProductiveServerForTests } = await import(
      "../../server/McpProductiveServer"
    );
    resetMcpProductiveServerForTests();
    const servidor = getMcpProductiveServer(db);

    const ctx = {
      tenantId: "b6-t5",
      userId: "u1",
      agentId: "a1",
      requestId: "r1",
      traceId: "tr1",
      roles: ["admin"],
      scopes: ["docs:read"],
      idempotencyKey: "clave-que-no-se-suelta",
    };
    const peticion = {
      toolName: "docs_read",
      args: { path: "docs/ESTE_FICHERO_NO_EXISTE_B6.md" },
      ctx,
    };

    const fallida = await servidor.invoke(peticion as never);
    expect(fallida.ok, "la herramienta no llego a ejecutarse y fallar").toBe(false);

    resetIdempotencyForTests(); // el cache no cuenta: se mide la garantia

    const reintento = await servidor.invoke(peticion as never);

    expect(
      reintento.errorCode,
      "un fallo a mitad de ejecucion solto la clave: el reintento podria duplicar el efecto",
    ).toBe("idempotent_duplicate");
  });
});
