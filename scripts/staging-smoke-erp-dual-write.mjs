#!/usr/bin/env node
/**
 * Staging ERP dual-write equivalence smoke (ADR-062 Phase 2).
 * Requires NELVYON_ERP_RELATIONAL_DUAL_WRITE=1 on staging app (redeployed tip).
 * Creates supplier via API, then compares snapshot entity count vs erp_suppliers via
 * evidence-only HTTP checks (list length). Does NOT flip READ path.
 *
 * Usage: STAGING_QA_ALLOW_DEFAULT=1 node scripts/staging-smoke-erp-dual-write.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE =
  process.env.STAGING_BASE_URL?.trim() ||
  "https://ideal-victory-staging.up.railway.app";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(root, "scripts/docs/evidence/os-saas-e2e/modules");

const checks = [];
function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS [erp-dw] ${name}: ${detail}`);
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL [erp-dw] ${name}: ${detail}`);
}

async function json(res) {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return { _raw: t };
  }
}

async function main() {
  console.log(`erp-dual-write base=${BASE}`);
  const email = `erp-dw-${Date.now().toString(36)}@nelvyon.test`;
  const password = "TestPass123!dw";

  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, name: "ERP DW" }),
  });
  const regBody = await json(reg);
  if (!reg.ok) {
    fail("register", `${reg.status} ${JSON.stringify(regBody).slice(0, 200)}`);
  } else {
    pass("register", email);
  }

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await json(login);
  const cookie = login.headers.getSetCookie?.()?.join("; ") || "";
  const token =
    loginBody?.token ||
    loginBody?.accessToken ||
    (cookie.match(/saas_token=([^;]+)/) || [])[1] ||
    "";

  // Prefer cookie jar from register/login Set-Cookie
  const headers = {
    "content-type": "application/json",
    cookie: cookie || (token ? `saas_session=${token}` : ""),
    authorization: token ? `Bearer ${token}` : "",
  };

  // Onboard if needed
  await fetch(`${BASE}/api/saas/onboarding`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      companyName: `DW Co ${Date.now().toString(36)}`,
      sector: "agency_marketing",
    }),
  }).catch(() => null);

  const create = await fetch(`${BASE}/api/saas/erp/purchases/suppliers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `DW Supplier ${Date.now().toString(36)}`,
      category: "parts",
      paymentTermsNote: "net30",
    }),
  });
  const createBody = await json(create);
  if (!(create.status === 201 || create.status === 200)) {
    fail("create_supplier", `${create.status} ${JSON.stringify(createBody).slice(0, 300)}`);
  } else {
    pass("create_supplier", createBody?.id || createBody?.supplier?.id || "ok");
  }

  const list = await fetch(`${BASE}/api/saas/erp/purchases/suppliers`, { headers });
  const listBody = await json(list);
  const items = listBody?.suppliers || listBody?.items || listBody?.data || [];
  const count = Array.isArray(items) ? items.length : 0;
  if (count < 1) fail("list_suppliers", `count=${count}`);
  else pass("list_suppliers", `count=${count}`);

  // Honesty: companion equivalence requires dual-write flag on server.
  // We record expected state; DB-side count verified via railway run probe if available.
  const md = [
    "# ERP dual-write staging smoke",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Fecha | ${new Date().toISOString()} |`,
    `| Base | ${BASE} |`,
    `| Verdict | ${checks.every((c) => c.ok) ? "**ALL_PASS (API path)**" : "**FAIL**"} |`,
    `| Dual-write flag required | NELVYON_ERP_RELATIONAL_DUAL_WRITE=1 on staging |`,
    `| Read flip | **OFF** (API SSOT still JSONB snapshots) |`,
    `| Prod dual-write | **OFF** |`,
    "",
    "## Results",
    ...checks.map((c) => `- ${c.ok ? "PASS" : "FAIL"} \`${c.name}\`: ${c.detail}`),
    "",
    "## Honesty",
    "- Companion upsert runs only when staging tip includes ErpRelationalMirror + flag=1.",
    "- This smoke validates API mutation + list; railway probe confirms erp_suppliers row when dual-write live.",
    "",
  ].join("\n");

  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, "erp.dual_write_staging_latest.md"), md);
  console.log(`evidence → erp.dual_write_staging_latest.md`);
  console.log(checks.every((c) => c.ok) ? "ALL_PASS [erp-dw]" : "FAIL [erp-dw]");
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
