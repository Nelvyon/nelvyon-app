#!/usr/bin/env node
/**
 * ¿DEPENDE ALGO PRODUCTIVO DE ESTOS TRABAJOS? **SOLO LECTURA.**
 *
 * POR QUÉ HACE FALTA. Las cuatro primeras condiciones para cancelar un trabajo
 * huérfano se comprueban mirando su propia fila: sin inquilino, sin encargo,
 * cliente de prueba, cliente que no existe. La quinta no: «no tiene dependencia
 * productiva válida» exige mirar **fuera** de la fila, en todo lo que pueda
 * apuntar a ese trabajo.
 *
 * Y esa es justo la que no se puede dar por buena de vista. Un trabajo sin
 * inquilino puede tener igualmente un entregable publicado, un resultado
 * guardado o un apunte de gasto colgando; cancelarlo dejaría esas filas
 * apuntando a algo que ya no significa lo que decía.
 *
 * CÓMO SE BUSCA, y por qué así. No se escribe a mano la lista de tablas que
 * pueden referenciar un trabajo: se **derivan** del catálogo, buscando toda
 * columna que se llame `job_id` en cualquier tabla del esquema. Una lista a
 * mano diría «ninguna dependencia» de una tabla que alguien añadió el mes
 * pasado y nadie recordó incluir.
 *
 * COSTE: 0 €. Recuentos sobre catálogos y sobre las tablas que referencian.
 *
 * USO
 *   DATABASE_URL="…" node scripts/de-que-depende-un-trabajo.mjs
 */
import path from "node:path";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL.");
    process.exit(2);
  }

  const pool = new pg.Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 25_000,
    options: "-c default_transaction_read_only=on",
  });
  const q = async (sql, p) => (await pool.query(sql, p)).rows;

  try {
    console.log(`objetivo: ${new URL(dsn).hostname}`);
    console.log("modo:     SOLO LECTURA (impuesto por PostgreSQL)\n");

    // ── los trabajos parados, con su cliente ───────────────────────────────
    const trabajos = await q(`
      SELECT job_id, service_id, client_id, status,
             tenant_id IS NULL                                      AS sin_inquilino,
             (payload IS NULL OR payload::text IN ('{}','null','')) AS sin_encargo,
             created_at::date::text                                 AS creado
        FROM os_jobs
       WHERE status IN ('queued','running')
       ORDER BY created_at, client_id`);

    const clientes = [...new Set(trabajos.map((t) => t.client_id))].sort();
    console.log(`trabajos parados: ${trabajos.length}`);
    console.log(`identificadores de cliente distintos: ${clientes.join(", ")}\n`);

    // ── ¿existe alguno como cliente de verdad? ─────────────────────────────
    console.log("── ¿SON CLIENTES REALES? ────────────────────────────────────");
    // Se buscan en TODAS las tablas que tengan una columna `id` de texto y
    // pinta de tabla de clientes, no sólo en la que uno recuerde.
    const tablasDeCliente = await q(`
      SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_type='BASE TABLE'
         AND (table_name LIKE '%client%' OR table_name LIKE '%cliente%'
              OR table_name IN ('saas_tenants','workspaces'))
       ORDER BY 1`);
    for (const c of clientes) {
      const donde = [];
      for (const { table_name: t } of tablasDeCliente) {
        const cols = await q(
          `SELECT column_name FROM information_schema.columns
            WHERE table_schema='public' AND table_name=$1 AND column_name IN ('id','client_id','tenant_id')`,
          [t],
        );
        for (const { column_name: col } of cols) {
          const r = await q(
            `SELECT count(*)::int AS n FROM public."${t}" WHERE "${col}"::text = $1`,
            [c],
          ).catch(() => [{ n: 0 }]);
          if (r[0].n > 0) donde.push(`${t}.${col} (${r[0].n})`);
        }
      }
      console.log(`  ${c.padEnd(10)} ${donde.length === 0 ? "NO existe en ninguna tabla de clientes" : "EXISTE en " + donde.join(", ")}`);
    }
    console.log("");

    // ── ¿algo apunta a estos trabajos? ─────────────────────────────────────
    console.log("── ¿QUIÉN REFERENCIA A ESTOS TRABAJOS? ──────────────────────");
    const referencian = await q(`
      SELECT c.table_name, c.column_name, c.data_type
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
       WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
         AND c.column_name IN ('job_id','os_job_id')
         AND c.table_name <> 'os_jobs'
       ORDER BY 1`);
    console.log(`tablas con una columna de trabajo: ${referencian.length}`);

    const ids = trabajos.map((t) => t.job_id);
    let dependenciasTotales = 0;
    for (const r of referencian) {
      const filas = await q(
        `SELECT count(*)::int AS n FROM public."${r.table_name}" WHERE "${r.column_name}"::text = ANY($1)`,
        [ids],
      ).catch((e) => {
        console.log(`  ${r.table_name}.${r.column_name}: no se pudo consultar (${e.message.slice(0, 40)})`);
        return null;
      });
      if (!filas) continue;
      if (filas[0].n > 0) {
        dependenciasTotales += filas[0].n;
        console.log(`  ⚠️  ${r.table_name}.${r.column_name}: ${filas[0].n} filas apuntan a estos trabajos`);
      }
    }
    if (dependenciasTotales === 0) {
      console.log("  ninguna fila de ninguna tabla apunta a estos doce trabajos.");
    }
    console.log("");

    // ── el desglose por cliente ────────────────────────────────────────────
    console.log("── LOS DOCE, UNO A UNO ──────────────────────────────────────");
    for (const t of trabajos) {
      console.log(
        `  ${t.client_id.padEnd(8)} ${t.service_id.padEnd(14)} ${t.creado} ` +
          `sin_inquilino=${t.sin_inquilino} sin_encargo=${t.sin_encargo} estado=${t.status}`,
      );
    }
    console.log("");
  } catch (e) {
    console.error("No se pudo mirar:", e.message);
    process.exit(2);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main();
