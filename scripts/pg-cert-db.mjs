#!/usr/bin/env node
/**
 * Aprovisiona una base PostgreSQL DESECHABLE para certificar migraciones contra
 * un motor real (no SQLite, no dobles).
 *
 *   node scripts/pg-cert-db.mjs                      # crea y migra
 *   node scripts/pg-cert-db.mjs --drop               # solo destruye
 *
 * Requiere PG_CERT_ADMIN_URL apuntando a una instancia de test — por ejemplo la
 * del stack local:  docker compose -f backend/local-ai/docker-compose.yml up -d postgres
 * NUNCA apuntar a producción ni a una base con datos reales: la primera
 * operación es un DROP DATABASE.
 *
 * POR QUÉ HACEN FALTA SHIMS
 * -------------------------
 * La cadena de `backend/db/migrations` NO es replayable desde cero. Cuatro
 * dependencias no las crea ninguna migración del repo, así que una base nueva
 * las necesita antes de empezar. Están aquí, explícitas, en vez de escondidas:
 *
 *   1. esquema `auth` y `auth.uid()` — restos de Supabase (5 migraciones).
 *   2. roles `authenticated` / `anon` / `service_role` — idem, para los GRANT.
 *   3. extensión `pgcrypto` — `452` usa `gen_random_bytes()` y ninguna
 *      migración declara la extensión.
 *   4. tabla `workflows` — la crea SQLAlchemy (`backend/models/workflows.py`),
 *      nunca el SQL; `507` y `518` solo hacen ALTER sobre ella.
 *
 * Los shims son EXCLUSIVAMENTE de test. No son un parche a producción: en
 * producción esas piezas ya existen por historia del despliegue. Su necesidad
 * está documentada como deuda en el informe de certificación.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "backend", "db", "package.json"));
const pg = require("pg");

const ADMIN = process.env.PG_CERT_ADMIN_URL;
const DB = process.env.PG_CERT_DB_NAME ?? "nelvyon_mig_cert";
if (!ADMIN) {
  console.error("PG_CERT_ADMIN_URL required (instancia de test, nunca producción)");
  process.exit(1);
}
if (/prod/i.test(ADMIN)) {
  console.error("PG_CERT_ADMIN_URL parece apuntar a producción — abortado");
  process.exit(1);
}

// SIN SHIMS. Los habia —schema `auth`, roles, pgcrypto y la tabla `workflows`—
// y eran precisamente el motivo de que esta certificacion no viera el fallo que
// tumbo el despliegue de staging: la cadena moria en la 023 con
// `schema "auth" does not exist` sobre un PostgreSQL virgen, y aqui no, porque
// aqui el schema se creaba antes de migrar.
//
// Ahora esos prerrequisitos viven en `000_bootstrap_prerequisites.sql`, dentro
// de la cadena. Certificar y desplegar recorren el mismo camino, que es la
// unica forma de que certificar signifique algo.
const SHIMS = [];

const urlDe = (base, db) => { const u = new URL(base); u.pathname = `/${db}`; return u.toString(); };

async function main() {
  const admin = new pg.Client({ connectionString: ADMIN });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  console.log(`[cert-db] dropped ${DB}`);
  if (process.argv.includes("--drop")) { await admin.end(); return; }
  await admin.query(`CREATE DATABASE ${DB}`);
  await admin.end();

  const cli = new pg.Client({ connectionString: urlDe(ADMIN, DB) });
  await cli.connect();
  const v = await cli.query("SELECT version()");
  console.log(`[cert-db] ${v.rows[0].version.split(",")[0]}`);
  for (const s of SHIMS) await cli.query(s);
  console.log(`[cert-db] ${SHIMS.length} shims aplicados`);
  await cli.end();

  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "migrate-pg.mjs")], {
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, DATABASE_URL: urlDe(ADMIN, DB), NELVYON_DEPLOY_ENV: "test" },
  });
  const salida = r.stdout.toString();
  console.log(salida.split("\n").slice(-14).join("\n"));
  if (r.status !== 0 || !/"ok": true/.test(salida)) {
    console.error("[cert-db] la cadena de migraciones NO completó");
    process.exit(1);
  }
  console.log(`[cert-db] listo. MIG523_TEST_DATABASE_URL=${urlDe(ADMIN, DB).replace(/:[^:@/]+@/, ":***@")}`);
}

main().catch((e) => { console.error("[cert-db] FATAL:", e); process.exit(1); });
