/**
 * BLOQUE 8 · una consulta desbocada no se queda con la conexión.
 *
 * Está medido en `elPoolBajoPresion.pg.test.ts`: con el pool a dos y dos
 * consultas de dos segundos, una consulta trivial esperó **1803 ms**. Ese es el
 * mecanismo por el que un problema pequeño se convierte en una caída general —
 * y no hace falta un ataque para provocarlo: basta un informe grande, un índice
 * que falta, o una tabla que ha crecido más de lo previsto.
 *
 * El pool tiene `connectionTimeoutMillis`, que acota **cuánto espera** una
 * petición por una conexión libre. No tenía nada que acotara **cuánto retiene**
 * una conexión la consulta que ya la tiene. Son dos plazos distintos y el
 * segundo faltaba: el primero solo decide con qué mensaje mueres.
 *
 * Y falta un tercero, más silencioso: una transacción abierta que nadie cierra.
 * `DbClient.query` con contexto de inquilino hace `BEGIN`, la consulta y
 * `COMMIT`. Si el proceso muere entremedias —un despliegue, un OOM, un
 * `Ctrl+C`— la conexión se queda «idle in transaction» reteniendo sus bloqueos.
 * No consume CPU, no aparece en ninguna gráfica de consultas lentas, y bloquea
 * los `ALTER TABLE` de la siguiente migración.
 *
 * Los tres plazos se comprueban aquí contra PostgreSQL real, porque los tres los
 * aplica el servidor y no la aplicación.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

let opciones: (cs: string) => Record<string, unknown>;

beforeAll(async () => {
  if (!hayBase) return;
  process.env.DATABASE_URL = DSN;
  const mod = await import("../DbClient");
  opciones = (mod as unknown as { opcionesDePoolParaPruebas: typeof opciones })
    .opcionesDePoolParaPruebas;
});

afterAll(() => {
  delete process.env.NELVYON_DB_STATEMENT_TIMEOUT_MS;
  delete process.env.NELVYON_DB_IDLE_TX_TIMEOUT_MS;
});

soloConBase("BLOQUE 8 · los tres plazos del pool", () => {
  it("EL CONTROL: una consulta normal no se ve afectada", async () => {
    /**
     * Sin este control, un plazo demasiado corto pasaría los casos de abajo y
     * dejaría el producto rompiendo informes legítimos. Es la mitad que
     * convierte los negativos en evidencia.
     */
    const { Pool } = await import("pg");
    const p = new Pool(opciones(DSN) as never);
    try {
      const r = await p.query<{ n: number }>("SELECT count(*)::int AS n FROM pg_class");
      expect(r.rows[0]?.n).toBeGreaterThan(0);
      // Y una consulta de un segundo, que es larga pero razonable, TAMPOCO cae.
      await p.query("SELECT pg_sleep(1)");
    } finally {
      await p.end();
    }
  }, 30_000);

  it("una consulta desbocada la corta el SERVIDOR, no la paciencia de nadie", async () => {
    /**
     * Se baja el plazo a 400 ms y se lanza una consulta de diez segundos. Si el
     * servidor no la corta, esta prueba tarda diez segundos y falla — que es
     * exactamente lo que pasaba antes de configurarlo.
     */
    process.env.NELVYON_DB_STATEMENT_TIMEOUT_MS = "400";
    const { Pool } = await import("pg");
    const p = new Pool(opciones(DSN) as never);
    try {
      const t = Date.now();
      let mensaje = "";
      try {
        await p.query("SELECT pg_sleep(10)");
      } catch (e) {
        mensaje = e instanceof Error ? e.message : String(e);
      }
      const ms = Date.now() - t;
      console.info(`consulta de 10s cortada en ${ms}ms: ${mensaje}`);
      expect(mensaje, "la consulta de diez segundos se ejecuto entera").toBeTruthy();
      expect(mensaje.toLowerCase()).toMatch(/statement timeout|canceling/);
      expect(
        ms,
        "no la corto el servidor: retuvo la conexion los diez segundos",
      ).toBeLessThan(3_000);
    } finally {
      delete process.env.NELVYON_DB_STATEMENT_TIMEOUT_MS;
      await p.end();
    }
  }, 30_000);

  it("la conexión vuelve al pool USABLE después de que la corten", async () => {
    /**
     * Cortar una consulta no sirve de nada si deja la conexión inservible: el
     * pool se vaciaría igual, solo que más deprisa. Se comprueba que la misma
     * conexión sigue respondiendo.
     */
    process.env.NELVYON_DB_STATEMENT_TIMEOUT_MS = "400";
    const { Pool } = await import("pg");
    const p = new Pool({ ...(opciones(DSN) as object), max: 1 } as never);
    try {
      await p.query("SELECT pg_sleep(10)").catch(() => null);
      const r = await p.query<{ ok: number }>("SELECT 1::int AS ok");
      expect(r.rows[0]?.ok, "la conexion quedo inservible tras el corte").toBe(1);
    } finally {
      delete process.env.NELVYON_DB_STATEMENT_TIMEOUT_MS;
      await p.end();
    }
  }, 30_000);

  it("una transacción abierta y olvidada la cierra el servidor", async () => {
    /**
     * El plazo silencioso. Una conexión «idle in transaction» no consume CPU y
     * no aparece en ninguna gráfica de consultas lentas — pero retiene sus
     * bloqueos, y es lo que hace que el `ALTER TABLE` de la siguiente migración
     * se quede esperando para siempre.
     *
     * Se abre un `BEGIN`, se toca una tabla para que la transacción tenga
     * bloqueos de verdad, y se deja. El servidor debe cerrarla.
     */
    process.env.NELVYON_DB_IDLE_TX_TIMEOUT_MS = "500";
    const { Pool } = await import("pg");
    const p = new Pool(opciones(DSN) as never);
    try {
      const c = await p.connect();
      await c.query("BEGIN");
      await c.query("SELECT 1");
      await new Promise((r) => setTimeout(r, 1_200));
      let mensaje = "";
      try {
        await c.query("SELECT 1");
      } catch (e) {
        mensaje = e instanceof Error ? e.message : String(e);
      }
      c.release();
      console.info(`transaccion abierta y olvidada: ${mensaje || "SIGUE VIVA"}`);
      expect(
        mensaje,
        "la transaccion abierta sigue viva: retiene sus bloqueos indefinidamente y " +
          "bloqueara la proxima migracion",
      ).toBeTruthy();
      expect(mensaje.toLowerCase()).toMatch(/idle-in-transaction|terminating|connection/);
    } finally {
      delete process.env.NELVYON_DB_IDLE_TX_TIMEOUT_MS;
      await p.end().catch(() => null);
    }
  }, 30_000);

  it("los plazos por defecto son generosos, no agresivos", () => {
    /**
     * Un plazo corto de más es un defecto peor que no tener plazo: rompe
     * informes legítimos y lo hace de forma intermitente, que es la avería más
     * cara de diagnosticar. Los valores por defecto tienen que dejar sitio al
     * trabajo real y cortar solo lo desbocado.
     */
    const o = opciones(DSN) as { statement_timeout?: number; idle_in_transaction_session_timeout?: number };
    expect(o.statement_timeout, "no hay plazo de sentencia por defecto").toBeGreaterThanOrEqual(20_000);
    expect(o.statement_timeout, "el plazo por defecto es demasiado agresivo").toBeLessThanOrEqual(120_000);
    expect(o.idle_in_transaction_session_timeout).toBeGreaterThanOrEqual(10_000);
  });
});
