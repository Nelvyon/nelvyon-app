/**
 * Staging closure smoke — auditor E2E + OpenClaw staging coordination + catalog v1.
 * Usage: node scripts/staging-smoke-os-v1-closure.mjs [--skip-wait]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { waitForStagingDeploy } from "./lib/wait-for-deploy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE =
  process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const SKIP_WAIT = process.argv.includes("--skip-wait");

async function main() {
  console.log(`=== OS v1 closure smoke [${BASE}] ===`);
  if (!SKIP_WAIT) {
    await waitForStagingDeploy(BASE, { skipWait: false, label: "os-v1-closure" });
  } else console.log("SKIP wait");

  const live = await fetch(`${BASE}/api/health/live`);
  const liveJson = await live.json().catch(() => ({}));
  if (!live.ok) {
    console.error("FAIL health", live.status);
    process.exit(1);
  }
  console.log(`PASS health git_sha=${liveJson.git_sha ?? "?"}`);

  const r = spawnSync(
    process.execPath,
    [
      join(root, "apps/web/node_modules/vitest/vitest.mjs"),
      "run",
      join(root, "backend/agency/__tests__/OsCatalogV1Closure.test.ts"),
      "--reporter=dot",
    ],
    {
      cwd: join(root, "apps/web"),
      encoding: "utf8",
      env: {
        ...process.env,
        NELVYON_PACK_INDEPENDENT_AUDITOR: "1",
        NELVYON_OPENCLAW_BRIDGE_ENABLED: "1",
        NELVYON_OPENCLAW_STAGING_MODE: "1",
        NELVYON_SHARED_MEMORY_ENABLED: "0",
        NELVYON_MCP_PRODUCTIVE_ENABLED: "0",
        AUTONOMOUS_ALLOW_OPENAI: "0",
        NELVYON_CEO_PARTNER_PAYOUTS: "0",
      },
    },
  );
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) {
    console.error("FAIL unit/integration OsCatalogV1Closure");
    process.exit(r.status ?? 1);
  }
  console.log("PASS unit/integration OsCatalogV1Closure");

  // Regression: OpenClaw OFF path must remain fail-closed with clean env
  const rOff = spawnSync(
    process.execPath,
    [
      join(root, "apps/web/node_modules/vitest/vitest.mjs"),
      "run",
      join(root, "backend/agency/__tests__/OsEliteAgency.test.ts"),
      "--reporter=dot",
    ],
    {
      cwd: join(root, "apps/web"),
      encoding: "utf8",
      env: {
        ...process.env,
        NELVYON_PACK_INDEPENDENT_AUDITOR: "0",
        NELVYON_OPENCLAW_BRIDGE_ENABLED: "0",
        NELVYON_OPENCLAW_STAGING_MODE: "0",
        NELVYON_SHARED_MEMORY_ENABLED: "0",
      },
    },
  );
  process.stdout.write(rOff.stdout || "");
  process.stderr.write(rOff.stderr || "");
  if (rOff.status !== 0) {
    console.error("FAIL OpenClaw-OFF regression");
    process.exit(rOff.status ?? 1);
  }
  console.log("PASS OpenClaw-OFF regression");

  const outDir = join(root, "scripts/docs/evidence/os-saas-e2e/modules");
  mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const body = [
    `# OS v1 closure — auditor + OpenClaw staging + catalog`,
    ``,
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Fecha | ${new Date().toISOString()} |`,
    `| Staging | ${BASE} |`,
    `| git_sha live | ${liveJson.git_sha ?? "?"} |`,
    `| Auditor E2E | PASS (pass / reject+repair / second pass) |`,
    `| OpenClaw staging | PASS (staging_mock · SM productive 0 · spend 0) |`,
    `| Catalog v1 | PASS integrity |`,
    `| MCP / OpenAI / payouts / SM productive | OFF |`,
    `| claimReady | false |`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, `auditor.openclaw.catalog_v1_${ts}.md`), body);
  writeFileSync(join(outDir, "auditor.openclaw.catalog_v1.md"), body);
  console.log("ALL_PASS os-v1-closure");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
