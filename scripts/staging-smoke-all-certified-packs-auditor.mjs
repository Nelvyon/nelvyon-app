/**
 * Staging — all certified pack families with independent auditor ON (Railway flag).
 * Usage: node scripts/staging-smoke-all-certified-packs-auditor.mjs [--skip-wait]
 * Families: beta(5) · new-os(3) · growth local/ecommerce/saas-b2b
 * Does not touch prod. Requires STAGING_QA_PASSWORD.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { waitForStagingDeploy } from "./lib/wait-for-deploy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE =
  process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const SKIP_WAIT = process.argv.includes("--skip-wait");

function run(label, script, extraArgs = []) {
  console.log(`\n########## ${label} ##########\n`);
  const r = spawnSync(process.execPath, [join(root, script), ...extraArgs], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      STAGING_BASE_URL: BASE,
      STAGING_QA_ALLOW_DEFAULT: process.env.STAGING_QA_ALLOW_DEFAULT || "0",
    },
    stdio: "inherit",
  });
  return r.status ?? 1;
}

async function main() {
  console.log(`=== ALL certified packs + auditor [${BASE}] ===`);
  if (!SKIP_WAIT) {
    await waitForStagingDeploy(BASE, { skipWait: false, label: "all-packs-auditor" });
  } else console.log("SKIP wait");

  const live = await fetch(`${BASE}/api/health/live`);
  const liveJson = await live.json().catch(() => ({}));
  if (!live.ok) {
    console.error("FAIL health", live.status);
    process.exit(1);
  }
  console.log(`PASS health git_sha=${liveJson.git_sha ?? "?"}`);

  // Unit: auditor PASS/REJECT/repair + no self-approve
  const unit = spawnSync(
    process.execPath,
    [
      join(root, "apps/web/node_modules/vitest/vitest.mjs"),
      "run",
      join(root, "backend/agency/__tests__/OsCatalogV1Closure.test.ts"),
      join(root, "backend/agency/__tests__/OsEliteAgency.test.ts"),
      "--reporter=dot",
    ],
    {
      cwd: join(root, "apps/web"),
      encoding: "utf8",
      env: {
        ...process.env,
        NELVYON_PACK_INDEPENDENT_AUDITOR: "1",
        NELVYON_OPENCLAW_BRIDGE_ENABLED: "0",
        NELVYON_OPENCLAW_STAGING_MODE: "0",
      },
      stdio: "inherit",
    },
  );
  if (unit.status !== 0) {
    console.error("FAIL auditor unit");
    process.exit(unit.status ?? 1);
  }
  console.log("PASS auditor unit (incl. no self-approve / QA floor)");

  const results = [];
  results.push({
    label: "beta-5",
    code: run("beta packs (5)", "scripts/staging-smoke-beta-packs-e2e.mjs", ["--skip-wait"]),
  });
  results.push({
    label: "new-os-3",
    code: run("new OS packs (3)", "scripts/staging-smoke-new-os-packs-e2e.mjs", ["--skip-wait"]),
  });
  results.push({
    label: "local-growth",
    code: run("local-business-growth", "scripts/staging-smoke-local-pack-e2e.mjs", ["--skip-wait"]),
  });
  results.push({
    label: "ecommerce-growth",
    code: run("ecommerce-growth", "scripts/staging-smoke-ecommerce-pack-e2e.mjs", ["--skip-wait"]),
  });
  results.push({
    label: "saas-b2b-growth",
    code: run("saas-b2b-growth", "scripts/staging-smoke-saas-b2b-pack-e2e.mjs", ["--skip-wait"]),
  });

  const failed = results.filter((r) => r.code !== 0);
  const outDir = join(root, "scripts/docs/evidence/os-saas-e2e/modules");
  mkdirSync(outDir, { recursive: true });
  const body = [
    `# All certified packs + independent auditor`,
    ``,
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Fecha | ${new Date().toISOString()} |`,
    `| Staging | ${BASE} |`,
    `| git_sha | ${liveJson.git_sha ?? "?"} |`,
    `| Auditor flag | staging ON (NELVYON_PACK_INDEPENDENT_AUDITOR=1) |`,
    `| Results | ${results.map((r) => `${r.label}:${r.code === 0 ? "PASS" : "FAIL"}`).join(" · ")} |`,
    `| Failed | ${failed.length ? failed.map((f) => f.label).join(",") : "none"} |`,
    `| claimReady | false |`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "auditor.all_packs_e2e_latest.md"), body);

  if (failed.length) {
    console.error("CRITICAL_FAIL", failed);
    process.exit(1);
  }
  console.log("ALL_PASS all-certified-packs-auditor");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
