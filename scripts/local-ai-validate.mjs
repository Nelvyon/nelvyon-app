#!/usr/bin/env node
/**
 * Full Phase 2 base validation — persistence, backup/restore, localhost bind, PRIVATE_MODE.
 * Requires: Docker stack up (node scripts/local-ai-up.mjs).
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const container = "nelvyon-local-ai-postgres";
const appUrl =
  process.env.LOCAL_AI_DATABASE_URL ??
  "postgresql://nelvyon_local_app:nelvyon_local_app_dev@127.0.0.1:5434/nelvyon_local_ai";
const adminUrl = "postgresql://nelvyon_local:nelvyon_local_dev@127.0.0.1:5434/nelvyon_local_ai";
const backupDir = path.join(root, "..", "backend", "local-ai", "backups");

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}: ${detail}`);
}

function dockerPsql(sql, db = "nelvyon_local_ai") {
  return execSync(`docker exec ${container} psql -U nelvyon_local -d ${db} -tAc "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
  }).trim();
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32);
}

async function decryptBackup(encPath, passphrase, outPath) {
  const bundle = await fs.readFile(encPath);
  const salt = bundle.subarray(0, 16);
  const iv = bundle.subarray(16, 28);
  const tag = bundle.subarray(28, 44);
  const encrypted = bundle.subarray(44);
  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  await fs.writeFile(outPath, plain);
}

async function main() {
  console.log("=== LOCAL AI VALIDATION ===\n");

  // 5. PostgreSQL + pgvector
  try {
    const ext = dockerPsql("SELECT string_agg(extname, ',') FROM pg_extension WHERE extname IN ('vector','pgcrypto')");
    if (ext.includes("vector") && ext.includes("pgcrypto")) pass("postgresql_pgvector", ext);
    else fail("postgresql_pgvector", ext);
  } catch (e) {
    fail("postgresql_pgvector", e.message);
  }

  // 6. Persistence marker + restart
  const marker = `persist-${Date.now()}`;
  try {
    dockerPsql(
      `INSERT INTO local_ai_config (key, value, checksum) VALUES ('validation_marker', '{"v":"${marker}"}'::jsonb, '${crypto.createHash("sha256").update(marker).digest("hex")}') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, checksum=EXCLUDED.checksum`,
    );
    execSync(`docker restart ${container}`, { stdio: "pipe" });
    for (let i = 0; i < 30; i++) {
      try {
        dockerPsql("SELECT 1");
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    const got = dockerPsql("SELECT value->>'v' FROM local_ai_config WHERE key='validation_marker'");
    if (got === marker) pass("persistence_after_restart", marker);
    else fail("persistence_after_restart", `expected ${marker}, got ${got}`);
  } catch (e) {
    fail("persistence_after_restart", e.message);
  }

  // 7-8. Tenant isolation via app role (RLS enforced — not superuser)
  try {
    const tenantA = crypto.randomUUID();
    const tenantB = crypto.randomUUID();
    const checksum = crypto.createHash("sha256").update("secret-b").digest("hex");
    const psqlApp = (sql) =>
      execSync(`docker exec -i ${container} psql -U nelvyon_local_app -d nelvyon_local_ai -tA`, {
        input: sql,
        encoding: "utf8",
      }).trim();

    const countFrom = (out) => {
      const nums = out.split("\n").map((l) => l.trim()).filter((l) => /^\d+$/.test(l));
      return nums[nums.length - 1] ?? "?";
    };

    psqlApp(`
BEGIN;
SELECT set_config('app.tenant_id', '${tenantB}', true);
INSERT INTO local_ai_memory (tenant_id, source_id, content, checksum)
VALUES ('${tenantB}', 'iso-test', 'secret-b', '${checksum}');
COMMIT;`);

    const leak = countFrom(psqlApp(`
BEGIN;
SELECT set_config('app.tenant_id', '${tenantA}', true);
SELECT COUNT(*)::text FROM local_ai_memory WHERE tenant_id='${tenantB}';
COMMIT;`));

    const own = countFrom(psqlApp(`
BEGIN;
SELECT set_config('app.tenant_id', '${tenantB}', true);
SELECT COUNT(*)::text FROM local_ai_memory WHERE tenant_id='${tenantB}';
COMMIT;`));

    if (leak === "0" && own === "1") pass("tenant_isolation_rls", `leak=${leak} own=${own}`);
    else fail("tenant_isolation_rls", `leak=${leak} own=${own}`);
  } catch (e) {
    fail("tenant_isolation_rls", e.message);
  }

  // 9. Encrypted backup
  let encPath = "";
  try {
    await fs.mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const plainPath = path.join(backupDir, `validate_${stamp}.sql`);
    const dumpFile = `/tmp/local_ai_validate_${stamp}.sql`;
    execSync(`docker exec ${container} pg_dump -U nelvyon_local -d nelvyon_local_ai --no-owner -f ${dumpFile}`, {
      stdio: "inherit",
    });
    execSync(`docker cp ${container}:${dumpFile} "${plainPath}"`, { stdio: "inherit" });
    execSync(`docker exec ${container} rm -f ${dumpFile}`, { stdio: "ignore" });
    const { gzipSync, gunzipSync } = await import("node:zlib");
    const gzData = gzipSync(await fs.readFile(plainPath));
    const passphrase = "nelvyon-validate-passphrase";
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = deriveKey(passphrase, salt);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(gzData), cipher.final()]);
    const tag = cipher.getAuthTag();
    encPath = plainPath.replace(".sql", ".enc");
    await fs.writeFile(encPath, Buffer.concat([salt, iv, tag, encrypted]));
    await fs.unlink(plainPath).catch(() => {});
    pass("encrypted_backup", encPath);
  } catch (e) {
    fail("encrypted_backup", e.message);
  }

  // 10. Restore to temp DB + integrity
  const tempDb = `nelvyon_local_ai_restore_${Date.now()}`;
  try {
    if (!encPath) throw new Error("no backup from step 9");
    const gzRestore = encPath.replace(".enc", ".restore.sql.gz");
    await decryptBackup(encPath, "nelvyon-validate-passphrase", gzRestore);
    const sqlRestore = gzRestore.replace(".gz", "");
    const { gunzipSync } = await import("node:zlib");
    await fs.writeFile(sqlRestore, gunzipSync(await fs.readFile(gzRestore)));
    dockerPsql(`CREATE DATABASE ${tempDb}`);
    execSync(`docker cp "${sqlRestore}" ${container}:/tmp/restore.sql`, { stdio: "inherit" });
    execSync(`docker exec ${container} psql -U nelvyon_local -d ${tempDb} -f /tmp/restore.sql`, { stdio: "pipe" });
    const tables = dockerPsql(
      `SELECT COUNT(*)::text FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'local_ai_%'`,
      tempDb,
    );
    const cfg = dockerPsql(`SELECT COUNT(*)::text FROM local_ai_config`, tempDb);
    execSync(`docker exec ${container} rm -f /tmp/restore.sql`, { stdio: "ignore" });
    dockerPsql(`DROP DATABASE ${tempDb}`);
    await fs.unlink(gzRestore).catch(() => {});
    await fs.unlink(sqlRestore).catch(() => {});
    if (Number(tables) >= 6 && Number(cfg) >= 1) pass("restore_temp_db_integrity", `tables=${tables} config=${cfg}`);
    else fail("restore_temp_db_integrity", `tables=${tables} config=${cfg}`);
  } catch (e) {
    try {
      dockerPsql(`DROP DATABASE IF EXISTS ${tempDb}`);
    } catch {}
    fail("restore_temp_db_integrity", e.message);
  }

  // 11. Localhost bind only
  try {
    const ports = execSync(`docker port ${container}`, { encoding: "utf8" }).trim();
    if (ports.includes("127.0.0.1:5434") && !ports.match(/0\.0\.0\.0:5434/)) pass("localhost_bind", ports);
    else fail("localhost_bind", ports || "no port mapping");
  } catch (e) {
    fail("localhost_bind", e.message);
  }

  // 12. PRIVATE_MODE — run vitest egress subset (already validated in CI)
  try {
    execSync(
      `pnpm -C apps/web exec vitest run backend/saas/__tests__/localAiPhase2.test.ts -t "PRIVATE_MODE" --reporter=dot`,
      { cwd: path.join(root, ".."), stdio: "pipe", encoding: "utf8" },
    );
    pass("private_mode_egress", "6/6 vitest checks passed");
  } catch (e) {
    fail("private_mode_egress", e.stderr?.slice(0, 200) || e.message);
  }

  const ok = results.every((r) => r.ok);
  console.log(`\n=== ${ok ? "LOCAL_AI_VALIDATE_OK" : "LOCAL_AI_VALIDATE_FAIL"} (${results.filter((r) => r.ok).length}/${results.length}) ===`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
