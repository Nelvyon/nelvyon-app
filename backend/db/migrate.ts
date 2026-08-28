import fs from "fs";
import path from "path";

import { DbClient } from "./DbClient";
import { loadEnvFiles } from "./loadEnvFiles";
import {
  evaluateProdMigrateGate,
  readProdMigrateApproval,
  resolveDeployEnvironment,
} from "./prodMigrateGate";
import {
  describirOmision,
  isTolerableConsolidatedMigrationError,
  splitSqlStatements,
  type SentenciaOmitida,
} from "./splitSqlStatements";

const CONSOLIDATED_MIGRATION = "507_fastapi_runtime_schemas.sql";

/**
 * ADR-064: even the low-level `migrate.ts` entrypoint must refuse production
 * applies without CEO-auditable approval (blocks `pnpm migrate` bypass of migrate:prod).
 */
async function assertProdMigrateGate(db: DbClient, files: string[]): Promise<void> {
  const pending: string[] = [];
  for (const file of files) {
    const rows = await db.query<{ name: string }>("SELECT name FROM _migrations WHERE name = $1", [
      file,
    ]);
    if (rows.length === 0) pending.push(file);
  }
  const deploy = resolveDeployEnvironment();
  const approval = readProdMigrateApproval();
  const decision = evaluateProdMigrateGate({
    isProduction: deploy.isProduction,
    approval,
    pendingCount: pending.length,
  });
  console.log(
    `[migrate] deploy_env=${deploy.label} isProduction=${deploy.isProduction} pending_count=${pending.length}`,
  );
  console.log(`[migrate] gate: ${decision.message}`);
  if (!decision.allowApply) {
    await db.end();
    process.exit(decision.exitCode);
  }
}

async function runMigrations(): Promise<void> {
  loadEnvFiles();
  const db = DbClient.getInstance();
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      executed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  await assertProdMigrateGate(db, files);
  for (const file of files) {
    const rows = await db.query<{ name: string }>("SELECT name FROM _migrations WHERE name = $1", [file]);
    if (rows.length > 0) {
      console.log(`[migrate] skip: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`[migrate] run: ${file}`);
    if (file === CONSOLIDATED_MIGRATION) {
      await runConsolidatedMigration(db, file, sql);
    } else {
      await db.query(sql);
    }
    await db.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    console.log(`[migrate] done: ${file}`);
  }
  console.log("[migrate] all migrations complete");
  await db.end();
}

/**
 * La migracion consolidada se aplica sentencia a sentencia porque un esquema
 * heredado puede tener ya parte de lo que declara. Lo que NO puede hacer es
 * saltarse una sentencia que debia crear algo y registrarse igual como
 * aplicada: eso fue lo que dejo produccion sin `campaign_recipients`,
 * `funnel_steps`, `workflow_nodes`, `visual_workflow_executions` ni
 * `workflow_trigger_registry`, con `_migrations` diciendo que la 507 estaba
 * puesta. Campanas, embudos y workflows visuales llevan rotos desde entonces.
 *
 * Ahora las omisiones se enumeran, y si alguna era una sentencia que debia
 * cumplirse, la migracion FALLA y no se registra. Un fallo ruidoso al migrar
 * cuesta una tarde; una tabla ausente en produccion no se descubre hasta que
 * un cliente la pisa.
 */
async function runConsolidatedMigration(db: DbClient, file: string, sql: string): Promise<void> {
  const statements = splitSqlStatements(sql);
  let ok = 0;
  const omitidas: SentenciaOmitida[] = [];
  const intolerables: SentenciaOmitida[] = [];

  for (const stmt of statements) {
    try {
      await db.query(stmt);
      ok += 1;
    } catch (err: unknown) {
      const detalle = describirOmision(err, stmt);
      if (isTolerableConsolidatedMigrationError(err, stmt)) {
        omitidas.push(detalle);
        console.warn(`[migrate] warn ${file} [${detalle.code}]: ${detalle.preview}`);
        continue;
      }
      intolerables.push(detalle);
      // No se corta al primero: enumerar TODO lo que falta convierte una
      // partida de arreglos de uno en uno en un solo diagnostico completo.
    }
  }

  console.log(
    `[migrate] ${file}: ${ok} sentencias ok, ${omitidas.length} omitidas por deriva idempotente`,
  );

  if (intolerables.length > 0) {
    console.error(
      `[migrate] ${file}: ${intolerables.length} sentencia(s) NO se aplicaron y no son deriva:`,
    );
    for (const d of intolerables) console.error(`  [${d.code}] ${d.preview}  ->  ${d.message}`);
    throw new Error(
      `${file}: ${intolerables.length} sentencia(s) fallaron. La migracion NO se registra como aplicada.`,
    );
  }
}

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("[migrate] FATAL:", err);
    process.exit(1);
  });
