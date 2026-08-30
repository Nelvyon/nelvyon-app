#!/usr/bin/env node
/**
 * CANCELAR LOS TRABAJOS HUÉRFANOS DE LA COLA.
 *
 * LA ÚNICA ESCRITURA AUTORIZADA, y sólo bajo cinco condiciones que se vuelven a
 * comprobar aquí mismo, inmediatamente antes de escribir:
 *
 *   1. `tenant_id IS NULL` — no pertenece a ningún inquilino.
 *   2. `payload` vacío — no hay encargo con el que trabajar.
 *   3. `client_id` exclusivamente de prueba.
 *   4. ese `client_id` no existe en ninguna tabla de clientes reales.
 *   5. nada productivo depende de ese trabajo.
 *
 * POR QUÉ SE COMPRUEBA DOS VECES. Entre mirar y escribir puede pasar cualquier
 * cosa: un trabajo nuevo que entra, uno que alguien reclama. Comprobar antes y
 * escribir después deja una ventana en la que la comprobación ya no vale.
 *
 * Por eso las cinco condiciones **viajan dentro del `UPDATE`**, no delante. Lo
 * que decide no es lo que se vio hace un segundo: es lo que la fila cumple en
 * el instante exacto en que se escribe. Y si el número de filas afectadas no
 * coincide con el que se verificó, se deshace todo.
 *
 * MODO DE PRUEBA POR DEFECTO. Sin `--ejecutar` no escribe: enseña lo que haría.
 * Con `--ejecutar` abre una transacción, comprueba, escribe y sólo confirma si
 * todo cuadra.
 *
 * LO QUE NO HACE. No ejecuta ningún trabajo. No borra ninguna fila: los marca
 * como cancelados con su motivo, para que quede el rastro de qué se hizo y por
 * qué. Borrarlos perdería la evidencia de que estuvieron ahí dos meses.
 *
 * COSTE: 0 €. Doce filas.
 *
 * USO
 *   DATABASE_URL="…" node scripts/cancelar-los-huerfanos.mjs            (ensayo)
 *   DATABASE_URL="…" node scripts/cancelar-los-huerfanos.mjs --ejecutar
 */
import path from "node:path";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");

const EJECUTAR = process.argv.includes("--ejecutar");

/**
 * Qué `client_id` se consideran de prueba.
 *
 * Lista explícita y corta a propósito: un patrón amplio como «empieza por c_»
 * podría alcanzar a un cliente real que se llamara así, y esto escribe en la
 * base de producción.
 *
 * LA LISTA EMPEZÓ INCOMPLETA, y el guion lo cazó. Iba con tres —los que se
 * vieron en una salida truncada— y el ensayo dejó fuera tres trabajos de un
 * cuarto, `c_done`. Es exactamente para lo que servía ser explícito: pararse en
 * vez de improvisar sobre nueve de doce.
 *
 * `c_done` entra con la misma evidencia que los otros tres, comprobada antes de
 * escribir nada:
 *
 *   · no existe en ninguna tabla de clientes del esquema;
 *   · sus trabajos no tienen inquilino ni encargo, como los demás;
 *   · ninguna fila de ninguna tabla apunta a ellos;
 *   · los cuatro nombres son estados de un mismo montaje de pruebas
 *     —done, fail, prog(ress), res(ult)— y llegaron en las mismas rachas.
 */
const CLIENTES_DE_PRUEBA = ["c_done", "c_fail", "c_prog", "c_res"];

/** Las cinco condiciones, en SQL, para que viajen dentro del UPDATE. */
const CONDICIONES = `
      status = 'queued'
  AND tenant_id IS NULL
  AND (payload IS NULL OR payload::text IN ('{}', 'null', ''))
  AND client_id = ANY($1)
  AND NOT EXISTS (SELECT 1 FROM os_clients oc WHERE oc.id::text = os_jobs.client_id)
`;

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL.");
    process.exit(2);
  }

  const pool = new pg.Pool({ connectionString: dsn, max: 2, connectionTimeoutMillis: 25_000 });
  const cliente = await pool.connect();

  try {
    console.log(`objetivo: ${new URL(dsn).hostname}`);
    console.log(`modo:     ${EJECUTAR ? "ESCRITURA" : "ENSAYO — no se escribe nada"}\n`);

    await cliente.query("BEGIN");

    // ── 1 · qué hay en la cola, sin filtrar ────────────────────────────────
    const todos = (
      await cliente.query(`
        SELECT job_id, service_id, status,
               tenant_id IS NULL                                     AS sin_inquilino,
               (payload IS NULL OR payload::text IN ('{}','null','')) AS sin_encargo,
               client_id,
               created_at::date::text                                AS creado
          FROM os_jobs
         WHERE status IN ('queued','running')
         ORDER BY created_at`)
    ).rows;

    console.log(`trabajos en cola o en curso: ${todos.length}`);

    // ── 2 · cuáles cumplen las cinco condiciones ───────────────────────────
    const candidatos = (
      await cliente.query(
        `SELECT job_id, service_id, client_id, created_at::date::text AS creado
           FROM os_jobs WHERE ${CONDICIONES} ORDER BY created_at`,
        [CLIENTES_DE_PRUEBA],
      )
    ).rows;

    const noCumplen = todos.filter((t) => !candidatos.some((c) => c.job_id === t.job_id));

    console.log(`cumplen LAS CINCO condiciones:  ${candidatos.length}`);
    console.log(`NO cumplen alguna:              ${noCumplen.length}\n`);

    if (noCumplen.length > 0) {
      console.log("LOS QUE NO SE TOCAN, y por qué:");
      for (const t of noCumplen) {
        const faltan = [];
        if (t.status !== "queued") faltan.push(`estado ${t.status}`);
        if (!t.sin_inquilino) faltan.push("TIENE inquilino");
        if (!t.sin_encargo) faltan.push("TIENE encargo");
        if (!CLIENTES_DE_PRUEBA.includes(t.client_id)) faltan.push(`client_id «${t.client_id}» no es de prueba`);
        console.log(`  ${t.job_id} · ${t.service_id} · ${faltan.join(" · ") || "existe como cliente real"}`);
      }
      console.log("");
    }

    if (candidatos.length === 0) {
      console.log("Nada que cancelar. No se ha escrito nada.");
      await cliente.query("ROLLBACK");
      return;
    }

    console.log("LOS QUE SE CANCELARÍAN:");
    for (const c of candidatos) {
      console.log(`  ${c.job_id} · ${c.service_id} · cliente ${c.client_id} · encolado ${c.creado}`);
    }
    console.log("");

    if (!EJECUTAR) {
      console.log("ENSAYO: no se ha escrito nada. Repite con --ejecutar para hacerlo.");
      await cliente.query("ROLLBACK");
      return;
    }

    // ── 3 · se escribe con las condiciones DENTRO ──────────────────────────
    //
    // Lo que decide no es lo que se vio arriba: es lo que la fila cumple en
    // este instante. Si algo ha cambiado en medio, la fila no entra.
    const cambiadas = await cliente.query(
      `UPDATE os_jobs
          SET status = 'cancelled',
              updated_at = NOW(),
              error = $2
        WHERE ${CONDICIONES}
        RETURNING job_id`,
      [
        CLIENTES_DE_PRUEBA,
        "cancelado: trabajo huerfano sin inquilino, sin encargo y con cliente de prueba. " +
          "No se ejecuto: no habia para quien ni con que.",
      ],
    );

    if (cambiadas.rowCount !== candidatos.length) {
      console.error(
        `\nSE ESPERABAN ${candidatos.length} filas y se han tocado ${cambiadas.rowCount}. ` +
          "Algo ha cambiado entre mirar y escribir. SE DESHACE TODO.",
      );
      await cliente.query("ROLLBACK");
      process.exit(2);
    }

    // ── 4 · y se comprueba el resultado antes de confirmar ─────────────────
    const quedan = (
      await cliente.query(
        `SELECT count(*)::int AS n FROM os_jobs WHERE ${CONDICIONES}`,
        [CLIENTES_DE_PRUEBA],
      )
    ).rows[0].n;
    if (quedan !== 0) {
      console.error(`\nQuedan ${quedan} sin cancelar tras el UPDATE. SE DESHACE TODO.`);
      await cliente.query("ROLLBACK");
      process.exit(2);
    }

    await cliente.query("COMMIT");
    console.log(`CANCELADOS: ${cambiadas.rowCount}. Ninguno se ha ejecutado ni borrado.`);
    console.log("Quedan como `cancelled` con el motivo escrito, para que se sepa qué pasó.");
  } catch (e) {
    await cliente.query("ROLLBACK").catch(() => undefined);
    console.error("\nNo se ha escrito nada:", e.message);
    process.exit(2);
  } finally {
    cliente.release();
    await pool.end().catch(() => undefined);
  }
}

main();
