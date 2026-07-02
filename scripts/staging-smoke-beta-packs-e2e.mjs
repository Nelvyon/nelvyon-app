/**
 * Staging E2E — 5 beta packs (social-calendar, content-strategy, cro-audit, analytics-setup, brand-voice).
 * Usage: node scripts/staging-smoke-beta-packs-e2e.mjs [--skip-wait] [--pack social-calendar-pack]
 */
import {
  BASE,
  QA_EMAIL,
  defaultBetaIntake,
  getWorkspaceId,
  kickoffPack,
  operatorLogin,
  pollPackRun,
  createPortalInvite,
  acceptPortalInvite,
  portalLogin,
  fetchPortalDeliverables,
  verifyDeliverables,
  waitForDeploy,
} from "./lib/pack-e2e-shared.mjs";

const SKIP_WAIT = process.argv.includes("--skip-wait");
const packArgIdx = process.argv.indexOf("--pack");
const ONLY_PACK = packArgIdx !== -1 ? process.argv[packArgIdx + 1] : null;

const BETA_PACKS = [
  {
    id: "social-calendar-pack",
    label: "social-calendar",
    sector: "local",
    minDeliverables: 2,
    requiredTitles: ["Informe ejecutivo"],
  },
  {
    id: "content-strategy-pack",
    label: "content-strategy",
    sector: "saas_b2b",
    minDeliverables: 2,
    requiredTitles: ["Informe ejecutivo"],
  },
  {
    id: "cro-audit-pack",
    label: "cro-audit",
    sector: "ecommerce",
    minDeliverables: 2,
    requiredTitles: ["Informe ejecutivo"],
  },
  {
    id: "analytics-setup-pack",
    label: "analytics-setup",
    sector: "local",
    minDeliverables: 2,
    requiredTitles: ["Informe ejecutivo"],
  },
  {
    id: "brand-voice-pack",
    label: "brand-voice",
    sector: "local",
    minDeliverables: 2,
    requiredTitles: ["Informe ejecutivo"],
  },
];

const CRITICAL = [];
const WARN = [];

function fail(m, c, d) {
  CRITICAL.push({ module: m, check: c, detail: d });
  console.log(`FAIL [${m}] ${c}: ${d}`);
}
function warn(m, c, d) {
  WARN.push({ module: m, check: c, detail: d });
  console.log(`WARN [${m}] ${c}: ${d}`);
}
function pass(m, c, d = "ok") {
  console.log(`PASS [${m}] ${c}: ${d}`);
}

async function runBetaPackE2e(token, workspaceId, pack) {
  const runId = `${pack.label}-${Date.now()}`;
  const portalEmail = `portal-${pack.label}-${runId}@nelvyon.test`;
  const portalPassword = `PortalBetaQA2026!`;
  const businessName = `QA ${pack.label} ${runId}`;

  console.log(`\n========== BETA PACK: ${pack.id} ==========\n`);

  let run;
  try {
    run = await kickoffPack(
      token,
      workspaceId,
      pack.id,
      defaultBetaIntake({ businessName, sector: pack.sector, portalEmail }),
    );
    pass(pack.label, "kickoff", `run=${run.id} status=${run.status}`);
  } catch (e) {
    fail(pack.label, "kickoff", String(e));
    return false;
  }

  let finalRun;
  try {
    finalRun = await pollPackRun(token, workspaceId, pack.id, run.id);
  } catch (e) {
    fail(pack.label, "poll", String(e));
    return false;
  }

  if (finalRun.status === "failed") {
    fail(pack.label, "status", finalRun.error_message ?? "failed");
    return false;
  }
  if (finalRun.status === "needs_review") {
    warn(pack.label, "status", "needs_review — continuing");
  } else {
    pass(pack.label, "status", finalRun.status);
  }

  const osClientId = finalRun.os_client_id;
  const osProjectId = finalRun.os_project_id;
  if (!osClientId || !osProjectId) {
    fail(pack.label, "os ids", "missing os_client_id or os_project_id");
    return false;
  }

  try {
    const invite = await createPortalInvite(token, workspaceId, osClientId, portalEmail);
    pass(pack.label, "portal invite", portalEmail);

    let portalToken;
    try {
      portalToken = await acceptPortalInvite(invite.token, portalPassword);
      pass(pack.label, "portal accept", "ok");
    } catch {
      portalToken = await portalLogin(portalEmail, portalPassword);
      pass(pack.label, "portal login", "fallback ok");
    }

    const items = await fetchPortalDeliverables(portalToken, osProjectId);
    verifyDeliverables(items, {
      minCount: pack.minDeliverables,
      requiredTitles: pack.requiredTitles,
      modulePrefix: pack.label,
      fail,
      pass,
      warn,
    });
  } catch (e) {
    fail(pack.label, "portal", String(e));
    return false;
  }

  return true;
}

async function main() {
  console.log(`Beta Packs E2E → ${BASE}\n`);
  await waitForDeploy("beta packs", SKIP_WAIT);

  const token = await operatorLogin();
  pass("auth", "operator login", QA_EMAIL);
  const workspaceId = await getWorkspaceId(token);
  pass("auth", "workspace", String(workspaceId));

  const packs = ONLY_PACK
    ? BETA_PACKS.filter((p) => p.id === ONLY_PACK || p.label === ONLY_PACK)
    : BETA_PACKS;

  if (ONLY_PACK && packs.length === 0) {
    fail("config", "pack", `unknown pack: ${ONLY_PACK}`);
    process.exit(1);
  }

  let ok = 0;
  for (const pack of packs) {
    const success = await runBetaPackE2e(token, workspaceId, pack);
    if (success) ok += 1;
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Packs OK: ${ok}/${packs.length}`);
  if (WARN.length) console.log(`WARNINGS: ${WARN.length}`);
  if (CRITICAL.length === 0) {
    console.log("ALL_BETA_PACKS_PASS");
    process.exit(0);
  }
  console.log(`CRITICAL_FAILS: ${CRITICAL.length}`);
  for (const f of CRITICAL) console.log(`  [${f.module}] ${f.check}: ${f.detail}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
