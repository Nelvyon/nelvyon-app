/**
 * Que NO ha pasado en produccion: trabajos ejecutados y tamaño. SOLO LECTURA.
 * COSTE EXTERNO: 0 EUR.
 */
import pg from "pg";
const C = ["DATABASE_PUBLIC_URL","POSTGRES_PUBLIC_URL","DATABASE_URL","POSTGRES_URL"];
const n = C.find((x) => (process.env[x] ?? "").trim().length > 0);
const cli = new pg.Client({ connectionString: process.env[n], ssl: { rejectUnauthorized: false }, statement_timeout: 60_000 });
const out = { ok: true };
try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (s, p) => (await cli.query(s, p)).rows;
  out.osJobs = await q(`SELECT status, count(*)::int AS n FROM os_jobs GROUP BY status ORDER BY n DESC`);
  out.jobsUltimaHora = await q(
    `SELECT status, count(*)::int AS n FROM os_jobs
      WHERE updated_at > now() - interval '2 hours' GROUP BY status ORDER BY n DESC`);
  out.tamanoBase = (await q(`SELECT pg_size_pretty(pg_database_size(current_database())) AS t`))[0].t;
  out.conexiones = Number((await q(`SELECT count(*)::int AS n FROM pg_stat_activity`))[0].n);
  out.bloqueosEsperando = Number((await q(`SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted`))[0].n);
  await cli.query("ROLLBACK");
} catch (e) { out.ok = false; out.error = e instanceof Error ? e.message : String(e); }
finally { await cli.end().catch(() => {}); }
console.log(JSON.stringify(out, null, 2));
