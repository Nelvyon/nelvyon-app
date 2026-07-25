/**
 * Read-only probe: does the current DATABASE_URL Postgres advertise/install pgvector?
 * Usage (staging only): railway run -e staging -s ideal-victory -- node scripts/probe-pgvector.mjs
 * Never creates extensions. Never mutates.
 */
import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(JSON.stringify({ ok: false, error: "DATABASE_URL missing" }));
  process.exit(2);
}

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const available = await client.query(
    `SELECT name, default_version, installed_version
       FROM pg_available_extensions
      WHERE name IN ('vector', 'pgvector')
      ORDER BY name`,
  );
  const installed = await client.query(
    `SELECT extname, extversion FROM pg_extension
      WHERE extname IN ('vector', 'pgvector')
      ORDER BY extname`,
  );
  const ver = await client.query(`SELECT version()`);
  const out = {
    ok: true,
    postgres: ver.rows[0]?.version ?? null,
    available: available.rows,
    installed: installed.rows,
    pgvectorAvailable: available.rows.length > 0,
    pgvectorInstalled: installed.rows.length > 0,
    verdict:
      installed.rows.length > 0
        ? "INSTALLED"
        : available.rows.length > 0
          ? "AVAILABLE_NOT_INSTALLED"
          : "NOT_AVAILABLE",
  };
  console.log(JSON.stringify(out, null, 2));
  await client.end();
  process.exit(0);
} catch (err) {
  console.error(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
}
