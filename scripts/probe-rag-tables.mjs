/**
 * Read-only column/count probe for staging RAG-ish tables.
 */
import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(JSON.stringify({ ok: false, error: "DATABASE_URL missing" }));
  process.exit(2);
}

const tables = ["nelvyon_rag_chunks", "saas_tenant_memory_chunks", "local_ai_rag_chunks", "local_ai_rag_documents"];

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const out = [];
  for (const t of tables) {
    const exists = await client.query(
      `SELECT to_regclass($1) AS reg`,
      [`public.${t}`],
    );
    if (!exists.rows[0]?.reg) {
      out.push({ table: t, exists: false });
      continue;
    }
    const cols = await client.query(
      `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position`,
      [t],
    );
    const count = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
    out.push({
      table: t,
      exists: true,
      columns: cols.rows,
      count: count.rows[0].n,
      hasVectorCol: cols.rows.some((c) => c.udt_name === "vector"),
    });
  }
  console.log(JSON.stringify({ ok: true, tables: out }, null, 2));
  await client.end();
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
}
