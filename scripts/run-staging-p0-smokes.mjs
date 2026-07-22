/**
 * Run P0 staging smokes against live staging (PASS/FAIL gate).
 * Usage: node scripts/run-staging-p0-smokes.mjs [--skip-wait]
 *
 * Smokes (CI gate — validated against staging):
 *  1. staging-smoke-portal-packs.mjs          (always blocking)
 *  2. staging-smoke-local-pack-e2e.mjs        (SKIP exit 78 when LLM_NOT_CONFIGURED / IA OFF)
 *  3. staging-smoke-ecommerce-pack-e2e.mjs    (idem)
 *  4. staging-smoke-saas-b2b-pack-e2e.mjs     (idem)
 *
 * Pack E2E requires Ollama/OpenAI. While IA flags stay OFF (CEO), exit 78 =
 * honest SKIP — not a silent mock PASS. Set P0_REQUIRE_PACK_E2E=1 to treat
 * LLM_NOT_CONFIGURED as hard FAIL (after CEO IA canary).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skipWait = process.argv.includes("--skip-wait");
const extraArgs = skipWait ? ["--skip-wait"] : [];
/** EX_CONFIG — pack E2E deferred because LLM intentionally not configured. */
const SKIP_IA_OFF = 78;
const requirePackE2e = process.env.P0_REQUIRE_PACK_E2E?.trim() === "1";

const SMOKES = [
  { name: "portal-packs", script: "staging-smoke-portal-packs.mjs", optionalIa: false },
  { name: "local-pack-e2e", script: "staging-smoke-local-pack-e2e.mjs", optionalIa: true },
  { name: "ecommerce-pack-e2e", script: "staging-smoke-ecommerce-pack-e2e.mjs", optionalIa: true },
  { name: "saas-b2b-pack-e2e", script: "staging-smoke-saas-b2b-pack-e2e.mjs", optionalIa: true },
];

const results = [];

for (const smoke of SMOKES) {
  console.log(`\n========== P0 SMOKE: ${smoke.name} ==========\n`);
  const r = spawnSync(process.execPath, [join(__dirname, smoke.script), ...extraArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  const code = r.status ?? 1;
  const skipped = smoke.optionalIa && code === SKIP_IA_OFF && !requirePackE2e;
  const pass = code === 0;
  const ok = pass || skipped;
  results.push({ name: smoke.name, pass, skipped, ok, code });
  const label = skipped ? "SKIP_IA_OFF" : pass ? "PASS" : "FAIL";
  console.log(`\n>>> ${smoke.name}: ${label} (exit ${code})\n`);
  if (!ok) break;
}

console.log("\n========== P0 SUMMARY ==========");
for (const r of results) {
  const label = r.skipped ? "SKIP_IA_OFF" : r.pass ? "PASS" : "FAIL";
  console.log(`${label}  ${r.name}`);
}
const portalOk = results.some((r) => r.name === "portal-packs" && r.pass);
const allOk = results.every((r) => r.ok) && results.length === SMOKES.length && portalOk;
if (allOk) {
  if (results.some((r) => r.skipped)) {
    console.log("ALL_P0_PASS_WITH_IA_OFF_SKIPS");
  } else {
    console.log("ALL_P0_PASS");
  }
  process.exit(0);
}
console.log("P0_FAIL");
process.exit(1);
}
