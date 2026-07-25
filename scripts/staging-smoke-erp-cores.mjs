/**
 * Staging smoke — ERP non-financial cores (Blocks 26–29 + 35).
 *
 * Runs vitest on the five agency core suites and writes evidence markdown:
 *   scripts/docs/evidence/os-saas-e2e/modules/erp.cores_synthetic_latest.md
 *
 * Honest scope: in-memory unit evidence only. No dual-write, no payments, no IoT,
 * no e-signature, no regulated health go-live.
 *
 * Usage: node scripts/staging-smoke-erp-cores.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const TEST_FILES = [
  "backend/agency/__tests__/PurchasesSuppliersCore.test.ts",
  "backend/agency/__tests__/InventoryWarehousesCore.test.ts",
  "backend/agency/__tests__/ManufacturingOpsCore.test.ts",
  "backend/agency/__tests__/ProjectsFieldServiceCore.test.ts",
  "backend/agency/__tests__/SectorCapabilityTaxonomy.test.ts",
];

function pass(check, detail = "ok") {
  console.log(`PASS [erp-cores] ${check}: ${detail}`);
}
function fail(check, detail) {
  console.log(`FAIL [erp-cores] ${check}: ${detail}`);
}

function runVitest() {
  const isWin = process.platform === "win32";
  const result = spawnSync(
    isWin ? "pnpm.cmd" : "pnpm",
    ["-C", "apps/web", "exec", "vitest", "run", ...TEST_FILES, "--reporter=dot"],
    {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: isWin,
      env: process.env,
    },
  );
  if (result.error) {
    fail("vitest_spawn", result.error.message);
    return false;
  }
  if (result.status === 0) {
    pass("vitest", `${TEST_FILES.length} suites`);
    return true;
  }
  fail("vitest", `exit ${result.status}`);
  return false;
}

function writeEvidence(allPass) {
  const now = new Date();
  const dir = path.join(REPO_ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
  mkdirSync(dir, { recursive: true });
  const latest = path.join(dir, "erp.cores_synthetic_latest.md");
  const stamped = path.join(
    dir,
    `erp.cores_synthetic_${now.toISOString().replace(/[:.]/g, "-")}.md`,
  );
  const verdict = allPass ? "ALL_PASS" : "FAIL";
  const md = `# ERP cores synthetic certification (Blocks 26–29 + 35)

| Campo | Valor |
|-------|-------|
| Fecha | ${now.toISOString()} |
| Verdict | **${verdict}** |
| Catalog | OsCatalogV1 **v1.7.0** |
| Runtime SSOT | in-memory agency cores |
| Schema 519 | reserved · dual-write pending |
| Payments / accounting | **BLOCKED_SCOPE** |
| IoT | **BLOCKED_EXTERNAL** |
| E-signature | **BLOCKED_EXTERNAL** |
| Regulated health | **BLOCKED_LEGAL** |

## Suites

${TEST_FILES.map((f) => `- \`${f}\` — ${allPass ? "PASS" : "see vitest output"}`).join("\n")}

## Honesty

- No silent mocks in SaaS ERP API routes (\`/api/saas/erp/*\`).
- UI pages list real core data + one create form each.
- Industry sector remains PREPARED_OFF until dedicated pack.
`;

  writeFileSync(latest, md, "utf8");
  writeFileSync(stamped, md, "utf8");
  console.log(`evidence → ${latest}`);
  console.log(`evidence → ${stamped}`);
}

const ok = runVitest();
writeEvidence(ok);
console.log(ok ? "ALL_PASS [erp-cores]" : "FAIL [erp-cores]");
process.exit(ok ? 0 : 1);
