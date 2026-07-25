/**
 * Read-only staging RAG/pgvector inventory (no CREATE, no ingest).
 * railway run -e staging -s ideal-victory -- node scripts/probe-rag-schema.mjs
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

const sql = `
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND (
     table_name ILIKE '%vector%'
     OR table_name ILIKE '%rag%'
     OR table_name ILIKE '%embed%'
     OR table_name ILIKE '%chunk%'
     OR table_name = 'nelvyon_rag_chunks'
     OR table_name = 'local_ai_documents'
     OR table_name = 'local_ai_chunks'
   )
 ORDER BY table_name;
`;

try {
  await client.connect();
  const tables = await client.query(sql);
  const ollama = {
    OLLAMA_HOST: process.env.OLLAMA_HOST ? "SET" : "ABSENT",
    OLLAMA_CONFIGURED: process.env.OLLAMA_CONFIGURED ?? "ABSENT",
    NELVYON_AI_ENABLED: process.env.NELVYON_AI_ENABLED ?? "ABSENT",
    LOCAL_AI_DATABASE_URL: process.env.LOCAL_AI_DATABASE_URL ? "SET" : "ABSENT",
    AUTONOMOUS_ALLOW_OPENAI: process.env.AUTONOMOUS_ALLOW_OPENAI ?? "ABSENT",
  };
  const ext = await client.query(
    `SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`,
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        vectorExtension: ext.rows,
        ragRelatedTables: tables.rows.map((r) => r.table_name),
        env: ollama,
        verdict:
          ext.rows.length > 0 && !process.env.OLLAMA_HOST
            ? "PGVECTOR_INSTALLED_OLLAMA_ABSENT_PREPARED_OFF"
            : ext.rows.length > 0 && process.env.OLLAMA_HOST
              ? "PGVECTOR_AND_OLLAMA_PRESENT"
              : "PGVECTOR_MISSING",
      },
      null,
      2,
    ),
  );
  await client.end();
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
}
