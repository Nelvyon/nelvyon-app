#!/usr/bin/env node
/**
 * Postgres backup → restore drill against ephemeral cert DB (Docker).
 * Proves DR procedure in-repo without Railway credentials.
 *
 * Usage:
 *   DATABASE_URL=postgresql://nelvyon:nelvyon@localhost:5433/nelvyon_test \
 *     node scripts/run-postgres-restore-drill.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "docs", "evidence", "os-saas-e2e");
const BACKUP_DIR = path.join(ROOT, "docs", "evidence", "os-saas-e2e", "dr_backups");
const CONTAINER = process.env.CERT_PG_CONTAINER || "nelvyon-test-postgres";
const SOURCE_DB = process.env.CERT_SOURCE_DB || "nelvyon_test";
// El rol estaba fijado a PGUSER, asi que el drill solo podia correr
// contra un contenedor concreto. La base de certificacion del repo usa
// otro rol, y el simulacro no llegaba ni a hacer el dump.
const PGUSER = process.env.CERT_PG_USER || "nelvyon";
const RESTORE_DB = `nelvyon_restore_drill_${Date.now()}`;

const require = createRequire(path.join(ROOT, "backend", "db", "package.json"));
const pg = require("pg");

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return { status: r.status ?? 1, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function dockerExec(args) {
  return sh("docker", ["exec", CONTAINER, ...args]);
}

const results = [];
function record(flow, ok, detail = {}) {
  results.push({ flow, ok, ...detail, at: new Date().toISOString() });
  console.log(`${ok ? "PASS" : "FAIL"} ${flow}${detail.error ? ` — ${detail.error}` : ""}`);
}

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ping = dockerExec(["pg_isready", "-U", PGUSER, "-d", SOURCE_DB]);
  record("dr.container_ready", ping.status === 0, { out: ping.out || ping.err });

  // Seed marker table/row on source
  const url = process.env.DATABASE_URL;
  if (!url) {
    record("dr.database_url", false, { error: "DATABASE_URL required" });
    return finish("FAIL");
  }
  record("dr.database_url", true);

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const marker = `drill-${Date.now()}`;
  await client.query(`
    CREATE TABLE IF NOT EXISTS _nelvyon_restore_drill (
      id text PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`INSERT INTO _nelvyon_restore_drill (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [
    marker,
  ]);
  record("dr.seed_marker", true, { marker });

  const dumpName = `restore_drill_${Date.now()}.dump`;
  const dumpHost = path.join(BACKUP_DIR, dumpName);
  const dumpContainer = `/tmp/${dumpName}`;

  const dump = dockerExec([
    "pg_dump",
    "-U",
    PGUSER,
    "-d",
    SOURCE_DB,
    "-Fc",
    "-f",
    dumpContainer,
  ]);
  record("dr.pg_dump", dump.status === 0, { error: dump.status !== 0 ? dump.err : undefined });

  const cp = sh("docker", ["cp", `${CONTAINER}:${dumpContainer}`, dumpHost]);
  const bytes = fs.existsSync(dumpHost) ? fs.statSync(dumpHost).size : 0;
  // `docker cp` devuelve 0 aunque el fichero este vacio: cuando `pg_dump` fallo
  // al conectar, este paso daba PASS sobre un dump de 0 bytes. Un simulacro de
  // recuperacion que aprueba una copia inexistente es peor que no tenerlo,
  // porque produce la confianza sin el respaldo. Un dump `-Fc` valido nunca es
  // trivialmente pequeno: lleva cabecera y catalogo de objetos.
  const MINIMO_DUMP_BYTES = 512;
  record("dr.copy_dump", cp.status === 0 && bytes >= MINIMO_DUMP_BYTES, {
    path: dumpHost,
    bytes,
    error:
      bytes < MINIMO_DUMP_BYTES
        ? `dump de ${bytes} bytes: por debajo del minimo de ${MINIMO_DUMP_BYTES}; no hay copia que restaurar`
        : undefined,
  });

  const createDb = dockerExec(["psql", "-U", PGUSER, "-d", "postgres", "-c", `CREATE DATABASE ${RESTORE_DB}`]);
  record("dr.create_restore_db", createDb.status === 0, { db: RESTORE_DB, error: createDb.err || undefined });

  const restore = dockerExec([
    "pg_restore",
    "-U",
    PGUSER,
    "-d",
    RESTORE_DB,
    "--no-owner",
    "--clean",
    "--if-exists",
    dumpContainer,
  ]);
  // pg_restore may return 1 with warnings; check marker instead
  const check = dockerExec([
    "psql",
    "-U",
    PGUSER,
    "-d",
    RESTORE_DB,
    "-t",
    "-A",
    "-c",
    `SELECT id FROM _nelvyon_restore_drill WHERE id='${marker}'`,
  ]);
  const restored = check.status === 0 && check.out === marker;
  record("dr.restore_marker", restored, {
    out: check.out,
    restore_status: restore.status,
    restore_err: restore.err?.slice(0, 200),
  });

  // Cleanup restore DB + marker optional leave on source for audit
  dockerExec(["psql", "-U", PGUSER, "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${RESTORE_DB}`]);
  dockerExec(["rm", "-f", dumpContainer]);
  await client.query(`DELETE FROM _nelvyon_restore_drill WHERE id=$1`, [marker]);
  await client.end();
  record("dr.cleanup", true);

  return finish(results.every((r) => r.ok) ? "PASS" : "FAIL");
}

function finish(decision) {
  const summary = {
    tag: "postgres_restore_drill",
    timestamp: new Date().toISOString(),
    decision,
    container: CONTAINER,
    sourceDb: SOURCE_DB,
    totals: {
      pass: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
      flows: results.length,
    },
    results,
    hash: createHash("sha256").update(JSON.stringify(results)).digest("hex").slice(0, 16),
  };
  const latest = path.join(OUT_DIR, "postgres_restore_drill_latest.json");
  fs.writeFileSync(latest, JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, `postgres_restore_drill_${summary.timestamp.replace(/[:.]/g, "-")}.json`),
    JSON.stringify(summary, null, 2),
  );
  console.log("\n======== RESTORE DRILL ========");
  console.log(JSON.stringify({ decision, totals: summary.totals }, null, 2));
  console.log(`evidence: ${latest}`);
  process.exit(decision === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
