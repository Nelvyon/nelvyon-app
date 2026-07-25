/**
 * Staging smoke — ERP Postgres persistence restart survival (mig 520).
 *
 * Parent orchestrates Railway restart between phases:
 *   --phase=before  create unique supplier, write checkpoint JSON
 *   --phase=after   read checkpoint, GET list, assert supplier still present
 *
 * Usage:
 *   STAGING_QA_ALLOW_DEFAULT=1 node scripts/staging-smoke-erp-persistence.mjs --phase=before
 *   # … railway restart …
 *   STAGING_QA_ALLOW_DEFAULT=1 node scripts/staging-smoke-erp-persistence.mjs --phase=after
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getWorkspaceIdWithFallback } from "./lib/smoke-workspace.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const EVIDENCE_DIR = path.join(REPO_ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
const CHECKPOINT = path.join(EVIDENCE_DIR, "erp.persistence_checkpoint.json");
const LATEST_MD = path.join(EVIDENCE_DIR, "erp.persistence_restart_latest.md");

const BASE =
  process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD =
  process.env.STAGING_QA_PASSWORD?.trim() ||
  (process.env.STAGING_QA_ALLOW_DEFAULT === "1"
    ? "StagingQA2026!"
    : (() => {
        throw new Error("STAGING_QA_PASSWORD is required (or STAGING_QA_ALLOW_DEFAULT=1)");
      })());
const COOKIE = "nelvyon_token";

const phaseArg = process.argv.find((a) => a.startsWith("--phase="));
const PHASE = phaseArg ? phaseArg.split("=")[1] : null;
if (PHASE !== "before" && PHASE !== "after") {
  console.error("Usage: node scripts/staging-smoke-erp-persistence.mjs --phase=before|after");
  process.exit(2);
}

const CRITICAL = [];

function pass(check, detail = "ok") {
  console.log(`PASS [erp-persist] ${check}: ${detail}`);
}
function fail(check, detail) {
  CRITICAL.push({ check, detail });
  console.log(`FAIL [erp-persist] ${check}: ${detail}`);
}

function headers(token, workspaceId) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    Cookie: `${COOKIE}=${token}`,
    "X-Workspace-Id": workspaceId,
    "Content-Type": "application/json",
  };
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error("No token");
  pass("auth", `userId=${data.userId}`);
  return data.token;
}

async function ensureSaasTenant(token, workspaceId) {
  const h = headers(token, workspaceId);
  const dash = await fetch(`${BASE}/api/saas/dashboard`, { headers: h, cache: "no-store" });
  if (dash.ok) {
    pass("saas-tenant", "dashboard OK");
    return;
  }
  const onb = await fetch(`${BASE}/api/saas/onboarding/complete`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ business_name: "QA Smoke Tenant" }),
    cache: "no-store",
  });
  if (onb.ok || onb.status === 409) {
    pass("saas-tenant", onb.ok ? "onboarding completed" : "already onboarded");
    return;
  }
  fail("saas-tenant", `dashboard ${dash.status}, onboarding ${onb.status}`);
}

async function phaseBefore(token, workspaceId) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `ERP Persist Smoke ${ts}`;
  const res = await fetch(`${BASE}/api/saas/erp/purchases`, {
    method: "POST",
    headers: headers(token, workspaceId),
    body: JSON.stringify({
      action: "create_supplier",
      name,
      category: "smoke-persistence",
      paymentTermsNote: "Net 30 smoke",
    }),
    cache: "no-store",
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail("create_supplier", `HTTP ${res.status} non-JSON: ${text.slice(0, 200)}`);
    return false;
  }
  if (res.status !== 201 || !data?.supplier?.id) {
    fail("create_supplier", `HTTP ${res.status}: ${text.slice(0, 300)}`);
    return false;
  }
  const supplierId = data.supplier.id;
  pass("create_supplier", `id=${supplierId} name=${name}`);

  const getRes = await fetch(`${BASE}/api/saas/erp/purchases`, {
    headers: headers(token, workspaceId),
    cache: "no-store",
  });
  if (!getRes.ok) {
    fail("get_after_create", `HTTP ${getRes.status}`);
    return false;
  }
  const list = await getRes.json();
  const found = (list.suppliers ?? []).some((s) => s.id === supplierId);
  if (!found) {
    fail("get_after_create", "supplier not in GET list");
    return false;
  }
  pass("get_after_create", `found id=${supplierId}`);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const checkpoint = {
    phase: "before",
    createdAt: new Date().toISOString(),
    baseUrl: BASE,
    workspaceId,
    supplierId,
    supplierName: name,
  };
  writeFileSync(CHECKPOINT, JSON.stringify(checkpoint, null, 2), "utf8");
  pass("checkpoint", CHECKPOINT);
  return true;
}

async function phaseAfter(token, workspaceId) {
  let checkpoint;
  try {
    checkpoint = JSON.parse(readFileSync(CHECKPOINT, "utf8"));
  } catch (e) {
    fail("checkpoint_read", String(e));
    return false;
  }
  const { supplierId, supplierName } = checkpoint;
  if (!supplierId) {
    fail("checkpoint", "missing supplierId");
    return false;
  }
  pass("checkpoint_read", `id=${supplierId}`);

  const getRes = await fetch(`${BASE}/api/saas/erp/purchases`, {
    headers: headers(token, workspaceId),
    cache: "no-store",
  });
  if (!getRes.ok) {
    fail("get_after_restart", `HTTP ${getRes.status}`);
    return writeAfterEvidence(false, checkpoint, `GET ${getRes.status}`);
  }
  const list = await getRes.json();
  const suppliers = list.suppliers ?? [];
  const found = suppliers.find((s) => s.id === supplierId);
  if (!found) {
    fail("survive_restart", `supplier ${supplierId} missing after restart (n=${suppliers.length})`);
    return writeAfterEvidence(false, checkpoint, "supplier missing");
  }
  if (supplierName && found.name !== supplierName) {
    fail("survive_restart", `name mismatch: got ${found.name}`);
    return writeAfterEvidence(false, checkpoint, "name mismatch");
  }
  pass("survive_restart", `id=${supplierId} name=${found.name}`);
  return writeAfterEvidence(true, checkpoint, "supplier present after restart");
}

function writeAfterEvidence(allPass, checkpoint, detail) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const now = new Date();
  const verdict = allPass ? "ALL_PASS" : "FAIL";
  const md = `# ERP persistence restart smoke (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | ${now.toISOString()} |
| Verdict | **${verdict}** |
| Base | ${BASE} |
| Checkpoint supplierId | \`${checkpoint.supplierId ?? "?"}\` |
| Checkpoint name | ${checkpoint.supplierName ?? "?"} |
| Detail | ${detail} |
| SSOT | \`erp_domain_snapshots\` (mig 520) via \`withPurchasesPersistence\` |

## Honesty

- Restart is orchestrated by parent (Railway); this script only asserts survival.
- Payments / accounting remain **BLOCKED_SCOPE**.
- Without DATABASE_URL + mig 520 applied, after-restart assert is expected to FAIL.
`;
  writeFileSync(LATEST_MD, md, "utf8");
  const stamped = path.join(
    EVIDENCE_DIR,
    `erp.persistence_restart_${now.toISOString().replace(/[:.]/g, "-")}.md`,
  );
  writeFileSync(stamped, md, "utf8");
  console.log(`evidence → ${LATEST_MD}`);
  return allPass;
}

async function main() {
  console.log(`erp-persistence smoke phase=${PHASE} base=${BASE}`);
  const token = await login();
  const workspaceId = await getWorkspaceIdWithFallback(BASE, token, pass);
  await ensureSaasTenant(token, workspaceId);

  let ok = false;
  if (PHASE === "before") {
    ok = await phaseBefore(token, workspaceId);
  } else {
    ok = await phaseAfter(token, workspaceId);
  }

  if (CRITICAL.length) {
    console.log(`FAIL [erp-persist] phase=${PHASE} critical=${CRITICAL.length}`);
    process.exit(1);
  }
  console.log(ok ? `ALL_PASS [erp-persist] phase=${PHASE}` : `FAIL [erp-persist] phase=${PHASE}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
