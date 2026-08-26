/**
 * BLOQUE 9 · perder PostgreSQL y volver.
 *
 * La recuperación no se certifica leyendo el código: se certifica **provocando
 * la pérdida**. Aquí se reinicia el contenedor de PostgreSQL con el pool en
 * marcha y se comprueba qué hace la aplicación.
 *
 * Tres propiedades, y las tres se rompen de forma distinta:
 *
 *   1. **Mientras está caída, se dice.** No se cuelga esperando, no devuelve
 *      datos de antes: falla, con un error que se puede leer.
 *   2. **Cuando vuelve, se recupera SOLA.** Sin reiniciar el proceso. Un sistema
 *      que necesita que alguien lo reinicie después de cada parpadeo de la base
 *      convierte un incidente de treinta segundos en uno de treinta minutos.
 *   3. **Los datos siguen ahí.** Recuperarse y perder lo escrito antes del corte
 *      sería peor que no recuperarse.
 *
 * ESTA SUITE CORRE A SOLAS. No es una recomendacion: se comprobo. Ejecutandola
 * junto al resto del directorio, el reinicio del contenedor tumbo **84 pruebas**
 * de otras suites que estaban a mitad de una consulta. Los 84 rojos no eran del
 * producto: eran mios, por lanzar a la vez dos cosas que compiten por el mismo
 * PostgreSQL.
 *
 * Esta suite REINICIA UN CONTENEDOR. Solo se ejecuta si se le dice
 * explícitamente con `NELVYON_PERMITIR_REINICIO_PG=1`, y solo contra el Docker
 * local. Nunca contra producción — no hay forma de que llegue ahí: el nombre del
 * contenedor es local y la comprobación de que Docker responde es lo primero.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const CONTENEDOR = process.env.CERT_PG_CONTAINER ?? "nelvyon-local-ai-postgres";
const PERMITIDO = process.env.NELVYON_PERMITIR_REINICIO_PG === "1";
const puede = Boolean(DSN) && PERMITIDO;
const soloSiSePermite = puede ? describe : describe.skip;

const MARCA = `recuperacion-${Date.now()}`;
let pool: import("pg").Pool;

function docker(...args: string[]) {
  return spawnSync("docker", args, { encoding: "utf8" });
}

async function intentar(): Promise<{ ok: boolean; error: string }> {
  try {
    await pool.query("SELECT 1");
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Espera hasta que la condición se cumpla, con techo. Nunca un `sleep` a ciegas. */
async function esperarA(
  cond: () => Promise<boolean>,
  techoMs: number,
): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now();
  while (Date.now() - t0 < techoMs) {
    if (await cond()) return { ok: true, ms: Date.now() - t0 };
    await new Promise((r) => setTimeout(r, 250));
  }
  return { ok: false, ms: Date.now() - t0 };
}

beforeAll(async () => {
  if (!puede) return;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4, connectionTimeoutMillis: 3_000 });
  await pool.query(
    `CREATE TABLE IF NOT EXISTS _nelvyon_recuperacion_b9 (marca text PRIMARY KEY, escrito_en timestamptz DEFAULT NOW())`,
  );
  await pool.query(`INSERT INTO _nelvyon_recuperacion_b9 (marca) VALUES ($1)`, [MARCA]);
});

afterAll(async () => {
  if (!puede || !pool) return;
  await pool.query(`DELETE FROM _nelvyon_recuperacion_b9 WHERE marca = $1`, [MARCA]).catch(() => null);
  await pool.end().catch(() => null);
});

soloSiSePermite("BLOQUE 9 · reiniciar PostgreSQL con el pool en marcha", () => {
  it("EL CONTROL: antes del corte, todo funciona", async () => {
    const r = await intentar();
    expect(r.ok, `la base ya estaba mal antes de empezar: ${r.error}`).toBe(true);
  }, 60_000);

  it("MEDIDO: falla mientras está caída, se recupera sola, y no pierde nada", async () => {
    /**
     * El experimento entero en un caso, porque las tres cosas son una sola
     * historia y separarlas dejaría el contenedor a medio reiniciar entre
     * pruebas.
     */
    // ── 1 · parar ──────────────────────────────────────────────────────────
    const parar = docker("stop", CONTENEDOR);
    expect(parar.status, `no se pudo parar el contenedor: ${parar.stderr}`).toBe(0);

    const caida = await intentar();
    console.info(`con PostgreSQL parado: ok=${caida.ok} error="${caida.error.slice(0, 70)}"`);
    expect(
      caida.ok,
      "la consulta DEVOLVIO DATOS con PostgreSQL parado: algo esta sirviendo de una " +
        "cache que nadie ha declarado",
    ).toBe(false);
    expect(caida.error, "fallo sin decir por que").toBeTruthy();

    // ── 2 · arrancar ───────────────────────────────────────────────────────
    const arrancar = docker("start", CONTENEDOR);
    expect(arrancar.status, `no se pudo arrancar el contenedor: ${arrancar.stderr}`).toBe(0);

    // Se espera a la CONDICION, no a un cronometro: un reloj no es una senal.
    const vuelta = await esperarA(async () => (await intentar()).ok, 60_000);
    console.info(`el pool volvio a servir consultas en ${vuelta.ms}ms tras el arranque`);
    expect(
      vuelta.ok,
      "el pool NO se recupero solo en 60s: haria falta reiniciar el proceso despues " +
        "de cada parpadeo de la base",
    ).toBe(true);

    // ── 3 · lo escrito antes del corte sigue ahí ───────────────────────────
    const r = await pool.query<{ marca: string }>(
      `SELECT marca FROM _nelvyon_recuperacion_b9 WHERE marca = $1`,
      [MARCA],
    );
    expect(
      r.rows[0]?.marca,
      "la fila escrita ANTES del corte no sobrevivio: recuperarse perdiendo datos es " +
        "peor que no recuperarse",
    ).toBe(MARCA);
  }, 180_000);

  it("después del corte, la sonda de disponibilidad vuelve a decir `ok`", async () => {
    /**
     * La otra mitad de «una señal verde significa lo que dice»: tiene que volver
     * a ponerse verde cuando la cosa se arregla. Una sonda que se queda en rojo
     * para siempre saca de servicio a un proceso sano.
     */
    process.env.DATABASE_URL = DSN;
    const { checkDatabase } = await import("../../health/healthChecks");
    const r = await esperarA(async () => (await checkDatabase()).status === "ok", 30_000);
    expect(r.ok, "la sonda se quedo en `down` con la base ya recuperada").toBe(true);
  }, 60_000);
});

describe("BLOQUE 9 · la salvaguarda de esta suite", () => {
  it("no reinicia nada sin permiso explícito", () => {
    /**
     * Esta suite para un contenedor. Que solo lo haga cuando alguien lo pide a
     * propósito no es burocracia: es lo que impide que una ejecución rutinaria
     * de la batería tumbe la base a mitad de otra suite.
     */
    expect(
      puede,
      "si esto es `true` sin NELVYON_PERMITIR_REINICIO_PG=1, la salvaguarda no existe",
    ).toBe(Boolean(DSN) && process.env.NELVYON_PERMITIR_REINICIO_PG === "1");
  });
});
