/**
 * BLOQUE 8 · el pool bajo presión.
 *
 * La pregunta de este bloque no es «¿funciona?» sino «¿qué cambia cuando dejan
 * de llegar operaciones de una en una?». Y el sitio donde eso se decide primero
 * es el pool de PostgreSQL, porque es el recurso del que hay una cantidad fija.
 *
 * Tres cosas se miden aquí, y ninguna se supone:
 *
 *   1. **Qué pasa cuando se agotan las conexiones.** Con `NELVYON_DB_POOL_MAX`
 *      se puede bajar el pool a dos y provocar en local, en segundos, lo que en
 *      producción haría falta una avalancha para provocar. Las peticiones deben
 *      ESPERAR y resolverse, no perderse ni mezclarse.
 *
 *   2. **Cuánto cuesta el contexto de inquilino.** `DbClient.query` con
 *      inquilino activo NO hace una consulta: hace `BEGIN`, `set_config`, la
 *      consulta y `COMMIT` sobre una conexión dedicada. Son cuatro viajes de ida
 *      y vuelta en vez de uno. Es deliberado —es lo que impide que el contexto
 *      sobreviva al COMMIT y contamine la petición siguiente del pool— pero su
 *      coste bajo concurrencia hay que medirlo, no suponerlo.
 *
 *   3. **Si la saturación se recupera.** Un sistema que se degrada y vuelve es
 *      distinto de uno que se degrada y se queda ahí.
 *
 * Las cargas son deliberadamente pequeñas y reproducibles. Esto no es «medir
 * hasta quemar la máquina»: es aislar la variable, medirla, y comparar.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

/** Percentil sobre una muestra ya ordenada o sin ordenar. */
function pct(ms: number[], p: number): number {
  if (!ms.length) return NaN;
  const s = [...ms].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i] as number;
}

function resumen(nombre: string, ms: number[]): string {
  return (
    `${nombre}: n=${ms.length} p50=${pct(ms, 50).toFixed(0)}ms ` +
    `p95=${pct(ms, 95).toFixed(0)}ms p99=${pct(ms, 99).toFixed(0)}ms ` +
    `max=${Math.max(...ms).toFixed(0)}ms`
  );
}

let pool: import("pg").Pool;

beforeAll(async () => {
  if (!hayBase) return;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 8 });
});

afterAll(async () => {
  if (pool) await pool.end();
});

soloConBase("BLOQUE 8 · agotar el pool a propósito", () => {
  it("con el pool a 2 y 20 peticiones a la vez: NINGUNA se pierde", async () => {
    /**
     * La propiedad que importa cuando se agota un recurso finito no es «va
     * rápido»: es **no se pierde nada y nadie recibe lo de otro**. Un pool que
     * bajo presión devolviera la fila equivocada sería infinitamente peor que
     * uno lento.
     *
     * Cada petición pide su propio número y comprueba que le devuelven el suyo.
     */
    const { Pool } = await import("pg");
    const chico = new Pool({ connectionString: DSN, max: 2, connectionTimeoutMillis: 10_000 });
    try {
      const N = 20;
      const t0 = Date.now();
      const rs = await Promise.all(
        Array.from({ length: N }, async (_, i) => {
          const t = Date.now();
          const r = await chico.query<{ mio: number }>("SELECT $1::int AS mio", [i]);
          return { i, mio: r.rows[0]?.mio, ms: Date.now() - t };
        }),
      );
      const total = Date.now() - t0;
      console.info(resumen("pool=2, 20 concurrentes", rs.map((r) => r.ms)) + ` total=${total}ms`);

      expect(rs, "se perdieron peticiones").toHaveLength(N);
      for (const r of rs) {
        expect(r.mio, `la peticion ${r.i} recibio el resultado de otra`).toBe(r.i);
      }
    } finally {
      await chico.end();
    }
  }, 30_000);

  it("MEDIDO: una consulta lenta retiene su conexión y bloquea a las demás", async () => {
    /**
     * No hay `statement_timeout` configurado en el pool. Eso significa que una
     * consulta que tarde retiene su conexión **todo lo que tarde**, y con el
     * pool agotado las siguientes esperan.
     *
     * Se mide, no se supone: pool de 2, dos consultas de 2 segundos, y una
     * tercera trivial. Si la tercera tarda ~2 s, es que ha estado esperando a
     * que se libere una conexión — y ese es exactamente el mecanismo por el que
     * una consulta lenta se convierte en una caída general.
     */
    const { Pool } = await import("pg");
    const chico = new Pool({ connectionString: DSN, max: 2, connectionTimeoutMillis: 10_000 });
    try {
      const lentas = [
        chico.query("SELECT pg_sleep(2)"),
        chico.query("SELECT pg_sleep(2)"),
      ];
      // Un respiro para que las dos lentas cojan las dos conexiones.
      await new Promise((r) => setTimeout(r, 200));
      const t = Date.now();
      await chico.query("SELECT 1");
      const esperaTrivial = Date.now() - t;
      await Promise.all(lentas);

      console.info(`consulta trivial con el pool ocupado: ${esperaTrivial}ms`);
      expect(
        esperaTrivial,
        "la consulta trivial NO espero: el pool no estaba realmente agotado y la " +
          "medicion no vale",
      ).toBeGreaterThan(1_000);
      // Y la propiedad: espera, pero SE RESUELVE. No se pierde.
      expect(esperaTrivial).toBeLessThan(10_000);
    } finally {
      await chico.end();
    }
  }, 30_000);

  it("pasado el plazo de conexión, el fallo es EXPLÍCITO y no un cuelgue", async () => {
    /**
     * Con `connectionTimeoutMillis` corto y el pool ocupado, la petición que no
     * consigue conexión tiene que fallar con un error que se pueda leer. Un
     * cuelgue indefinido sería peor: la petición no responde, el cliente
     * reintenta, y la avalancha se realimenta.
     */
    const { Pool } = await import("pg");
    const chico = new Pool({ connectionString: DSN, max: 1, connectionTimeoutMillis: 300 });
    try {
      const lenta = chico.query("SELECT pg_sleep(2)");
      await new Promise((r) => setTimeout(r, 150));
      const t = Date.now();
      let mensaje = "";
      try {
        await chico.query("SELECT 1");
      } catch (e) {
        mensaje = e instanceof Error ? e.message : String(e);
      }
      const ms = Date.now() - t;
      await lenta.catch(() => null);

      console.info(`fallo por plazo de conexion en ${ms}ms: ${mensaje}`);
      expect(mensaje, "no fallo: se quedo esperando sin plazo").toBeTruthy();
      expect(mensaje.toLowerCase()).toMatch(/timeout|connection/);
      expect(ms, "el plazo no se respeto").toBeLessThan(3_000);
    } finally {
      await chico.end();
    }
  }, 30_000);
});

soloConBase("BLOQUE 8 · lo que cuesta el contexto de inquilino", () => {
  it("MEDIDO: con contexto son cuatro viajes en vez de uno", async () => {
    /**
     * `DbClient.query` con inquilino activo hace BEGIN + set_config + consulta +
     * COMMIT sobre una conexión dedicada. Aquí se reproduce esa forma con `pg`
     * directamente y se compara con la consulta suelta, en las MISMAS
     * condiciones y sobre la misma base.
     *
     * Lo que se certifica NO es un número —depende de la máquina— sino la
     * relación: el contexto multiplica el coste por un factor medible, y ese
     * factor es el precio del aislamiento. Se deja escrito para que quien mire
     * la latencia del panel sepa de dónde sale.
     */
    const N = 60;
    const sueltas: number[] = [];
    for (let i = 0; i < N; i += 1) {
      const t = Date.now();
      await pool.query("SELECT 1");
      sueltas.push(Date.now() - t);
    }
    const conContexto: number[] = [];
    for (let i = 0; i < N; i += 1) {
      const t = Date.now();
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        await c.query("SELECT set_config('app.tenant_id', $1, true)", ["tenant-medicion"]);
        await c.query("SELECT 1");
        await c.query("COMMIT");
      } finally {
        c.release();
      }
      conContexto.push(Date.now() - t);
    }
    console.info(resumen("SELECT suelto        ", sueltas));
    console.info(resumen("SELECT con contexto  ", conContexto));
    const factor = (pct(conContexto, 50) + 0.5) / (pct(sueltas, 50) + 0.5);
    console.info(`factor p50 del contexto de inquilino: x${factor.toFixed(1)}`);

    // La propiedad: el contexto cuesta MÁS (si no, no se está aplicando) y no
    // cuesta un orden de magnitud absurdo (si costara x50, el diseño no sería
    // viable y habría que saberlo).
    expect(
      pct(conContexto, 50),
      "el contexto no cuesta nada: comprueba que de verdad se esta aplicando",
    ).toBeGreaterThanOrEqual(pct(sueltas, 50));
    expect(factor, `el contexto multiplica el coste por ${factor.toFixed(1)}`).toBeLessThan(25);
  }, 60_000);
});

soloConBase("BLOQUE 8 · recuperarse de la saturación", () => {
  it("MEDIDO: después de la ráfaga, la latencia vuelve a la de antes", async () => {
    /**
     * Un sistema que se degrada y vuelve es distinto de uno que se degrada y se
     * queda ahí. Se mide antes, se satura, y se vuelve a medir.
     *
     * La comparación es contra la línea base de ESTA ejecución, no contra un
     * número escrito a mano: una máquina lenta no debe volver rojo un
     * comportamiento correcto.
     */
    const medir = async (n: number): Promise<number[]> => {
      const ms: number[] = [];
      for (let i = 0; i < n; i += 1) {
        const t = Date.now();
        await pool.query("SELECT 1");
        ms.push(Date.now() - t);
      }
      return ms;
    };

    const antes = await medir(40);
    // Ráfaga: 120 consultas a la vez sobre un pool de 8.
    const tR = Date.now();
    await Promise.all(Array.from({ length: 120 }, () => pool.query("SELECT 1")));
    const rafaga = Date.now() - tR;
    const despues = await medir(40);

    console.info(resumen("antes de la rafaga ", antes));
    console.info(`rafaga de 120 sobre pool=8: ${rafaga}ms`);
    console.info(resumen("despues de la rafaga", despues));

    const base = pct(antes, 95) + 1;
    const vuelta = pct(despues, 95) + 1;
    expect(
      vuelta,
      `la latencia NO volvio: p95 antes ${base - 1}ms, despues ${vuelta - 1}ms. ` +
        "El pool se queda degradado tras la saturacion.",
    ).toBeLessThan(base * 6);
  }, 60_000);
});
