/**
 * Ejecuta validadores contra staging (apps/web/.env.staging.local).
 * Uso: pnpm validate:staging
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptsDir, "..");

const env = { ...process.env, MIGRATE_ENV: "staging" };
const steps = [
  "validate:saas-deals-migrations",
  "validate:os-core-migrations",
  "saas:validate-bridge",
] as const;

let failed = false;
for (const step of steps) {
  console.log(`\n========== ${step} ==========\n`);
  const r = spawnSync("pnpm", [step], { cwd: webRoot, env, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    failed = true;
    console.error(`\n[validate:staging] FAILED at ${step}`);
    break;
  }
}

process.exit(failed ? 1 : 0);
