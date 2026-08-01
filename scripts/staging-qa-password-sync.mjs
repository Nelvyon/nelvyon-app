/**
 * Staging-only: ensure QA user password hash matches STAGING_QA_PASSWORD.
 * Never prints secrets. Safe to re-run (idempotent).
 */
import bcrypt from "bcryptjs";
import pg from "pg";

const email = (process.env.STAGING_QA_EMAIL || "qa-audit-20260612@nelvyon.test").trim().toLowerCase();
const pwd = process.env.STAGING_QA_PASSWORD?.trim() || "";
if (!pwd) {
  console.error("STAGING_QA_PASSWORD required");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  const r = await client.query(
    `SELECT user_id::text AS id, password_hash FROM nelvyon_users WHERE email = $1 LIMIT 1`,
    [email],
  );
  const row = r.rows[0];
  if (!row) {
    console.log(JSON.stringify({ ok: false, reason: "qa_user_missing", email }));
    process.exit(2);
  }
  const matches = await bcrypt.compare(pwd, row.password_hash);
  if (matches) {
    console.log(JSON.stringify({ ok: true, action: "noop", userId: row.id }));
    process.exit(0);
  }
  const hash = await bcrypt.hash(pwd, 12);
  await client.query(`UPDATE nelvyon_users SET password_hash = $1 WHERE user_id::text = $2`, [
    hash,
    row.id,
  ]);
  const verify = await bcrypt.compare(pwd, hash);
  console.log(JSON.stringify({ ok: verify, action: "password_hash_synced", userId: row.id }));
  process.exit(verify ? 0 : 3);
} finally {
  await client.end();
}
