import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const envPath = path.join(root, "apps/web/.env.staging.local");
const sqlPath = path.join(root, "backend/migrations/email_queue_scheduled_at.sql");

const env = fs.readFileSync(envPath, "utf8");
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
const col = await client.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'email_queue' AND column_name = 'scheduled_at'",
);
console.log(JSON.stringify({ migration_ok: col.rowCount > 0 }));
await client.end();
