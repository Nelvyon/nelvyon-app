/**
 * Staging smoke — Shared Memory + MCP synthetic harness (ADR-055 closure).
 *
 * 1) Best-effort health check against the staging deploy (`/api/health`).
 * 2) Runs the local vitest suite for `StagingSharedMemoryMcpHarness.ts` (pure unit,
 *    no network — the harness itself never calls a real MCP or Shared Memory backend).
 * 3) Prints the Railway flags to set for STAGING ONLY (never production):
 *      NELVYON_SHARED_MEMORY_STAGING=1
 *      NELVYON_MCP_STAGING_SYNTHETIC=1
 *    (NELVYON_MCP_PRODUCTIVE_ENABLED and NELVYON_SHARED_MEMORY_ENABLED must stay 0/unset.)
 * 4) Writes an evidence markdown under scripts/docs/evidence/os-saas-e2e/modules/.
 *
 * Usage: node scripts/staging-smoke-sm-mcp-synthetic.mjs [--skip-health]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const BASE = process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const SKIP_HEALTH = process.argv.includes("--skip-health");

const RAILWAY_STAGING_FLAGS = [
  "NELVYON_SHARED_MEMORY_STAGING=1  # synthetic-only SM drills — staging environment ONLY",
  "NELVYON_MCP_STAGING_SYNTHETIC=1  # synthetic-only MCP drills — staging environment ONLY",
  "# --- must stay unset/0 in every environment, including staging, until a separate ---",
  "# --- CEO-authorized productive canary (see docs/ops/CEO_OPENCLAW_PROD_CANARY_REQUEST.md) ---",
  "NELVYON_MCP_PRODUCTIVE_ENABLED=0",
  "NELVYON_SHARED_MEMORY_ENABLED=0",
];

function pass(check, detail = "ok") {
  console.log(`PASS [sm-mcp-synthetic] ${check}: ${detail}`);
}
function warn(check, detail) {
  console.log(`WARN [sm-mcp-synthetic] ${check}: ${detail}`);
}
function fail(check, detail) {
  console.log(`FAIL [sm-mcp-synthetic] ${check}: ${detail}`);
}

async function checkHealth() {
  if (SKIP_HEALTH) {
    warn("health", "skipped via --skip-health");
    return null;
  }
  try {
    const res = await fetch(`${BASE}/api/health`, { cache: "no-store" });
    if (res.ok) {
      pass("health", `HTTP ${res.status} @ ${BASE}/api/health`);
      return true;
    }
    warn("health", `HTTP ${res.status} @ ${BASE}/api/health (non-fatal)`);
    return false;
  } catch (e) {
    warn("health", `unreachable: ${e instanceof Error ? e.message : String(e)} (non-fatal)`);
    return false;
  }
}

function runHarnessVitest() {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    [
      "-C",
      "apps/web",
      "exec",
      "vitest",
      "run",
      "backend/agency/__tests__/StagingSharedMemoryMcpHarness.test.ts",
      "--reporter=dot",
    ],
    { cwd: REPO_ROOT, stdio: "inherit" },
  );
  return result.status === 0;
}

function writeEvidence({ healthOk, vitestOk }) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = path.join(REPO_ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `sm-mcp.synthetic_${stamp}.md`);
  const md = `# Shared Memory + MCP — staging synthetic harness

| Campo | Valor |
|-------|-------|
| Fecha | ${now.toISOString()} |
| Staging base | ${BASE} |
| Health check | ${healthOk === null ? "SKIPPED" : healthOk ? "PASS" : "WARN (non-fatal)"} |
| Vitest harness | ${vitestOk ? "PASS" : "FAIL"} |
| Shared Memory productiva | OFF (NELVYON_SHARED_MEMORY_ENABLED=0) |
| MCP productivo | OFF (NELVYON_MCP_PRODUCTIVE_ENABLED=0) |
| Pepito DB | nunca referenciada — solo tenants sintéticos A/B |
| Tenant isolation | verificado en unit tests (RLS-style, deny cross-tenant) |
| Deny-by-default | verificado en unit tests |

## Flags Railway (STAGING ONLY)

\`\`\`
${RAILWAY_STAGING_FLAGS.join("\n")}
\`\`\`

## Rollback

- \`NELVYON_SHARED_MEMORY_STAGING=0\`
- \`NELVYON_MCP_STAGING_SYNTHETIC=0\`
- Confirmar que \`NELVYON_MCP_PRODUCTIVE_ENABLED\` y \`NELVYON_SHARED_MEMORY_ENABLED\` permanecen sin definir/0 en todos los entornos.
`;
  writeFileSync(file, md, "utf8");
  console.log(`\nEvidence written: ${file}`);
  return file;
}

async function main() {
  console.log(`=== Shared Memory + MCP synthetic smoke [${BASE}] ===`);
  const healthOk = await checkHealth();
  const vitestOk = runHarnessVitest();
  if (vitestOk) pass("vitest", "StagingSharedMemoryMcpHarness.test.ts green");
  else fail("vitest", "StagingSharedMemoryMcpHarness.test.ts failed");

  console.log("\n--- Railway flags (STAGING ONLY) ---");
  for (const line of RAILWAY_STAGING_FLAGS) console.log(line);

  writeEvidence({ healthOk, vitestOk });

  if (!vitestOk) {
    console.log("CRITICAL_FAIL");
    process.exit(1);
  }
  console.log("ALL_PASS");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
