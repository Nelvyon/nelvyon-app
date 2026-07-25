/**
 * Staging HTTP Tenant A/B isolation — ERP Blocks 26–29 (mig 520).
 *
 * Registers two ephemeral SaaS tenants (JWT → tenant.id), seeds A data across
 * purchases/inventory/manufacturing/projects-fs, then asserts B cannot list,
 * mutate with A's ids, or infer A's entities via GET.
 *
 * Usage:
 *   node scripts/staging-smoke-erp-http-ab.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const EVIDENCE_DIR = path.join(REPO_ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
const BASE =
  process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app";

const CRITICAL = [];
const RESULTS = [];

function pass(check, detail = "ok") {
  RESULTS.push({ check, ok: true, detail });
  console.log(`PASS [erp-ab] ${check}: ${detail}`);
}
function fail(check, detail) {
  CRITICAL.push({ check, detail });
  RESULTS.push({ check, ok: false, detail });
  console.log(`FAIL [erp-ab] ${check}: ${detail}`);
}

async function req(method, urlPath, { token, body } = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.Cookie = `nelvyon_token=${token}`;
  }
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 240) };
  }
  return { status: res.status, json };
}

async function registerAndOnboard(label) {
  const email = `erp-ab-${label}-${randomUUID().slice(0, 8)}@nelvyon.test`;
  const password = "ErpAbPassw0rd!Live99";
  let reg = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    reg = await req("POST", "/api/auth/register", {
      body: { email, password, name: `ERP AB ${label}` },
    });
    if (reg.status !== 429) break;
    const waitSec = Number(reg.json?.retryAfter ?? 5);
    await new Promise((r) => setTimeout(r, Math.min(Math.max(waitSec, 1) * 1000, 60_000)));
  }
  const token = reg.json?.token;
  if (!token) {
    fail(`${label}.register`, `HTTP ${reg.status} ${JSON.stringify(reg.json).slice(0, 160)}`);
    return null;
  }
  pass(`${label}.register`, email);

  const create = await req("POST", "/api/saas/onboarding", {
    token,
    body: { companyName: `ERP-AB-${label}`, industry: "tech", plan: "pro", step: 4, goals: ["erp-ab"] },
  });
  const done = await req("POST", "/api/saas/onboarding/complete", {
    token,
    body: { business_name: `ERP-AB-${label}` },
  });
  const tenant = done.json?.tenant ?? create.json?.tenant;
  if (!tenant?.id) {
    // Some staging paths complete via dashboard warm
    const dash = await req("GET", "/api/saas/dashboard", { token });
    if (!dash.status || dash.status >= 400) {
      fail(`${label}.onboard`, `create=${create.status} done=${done.status} dash=${dash.status}`);
      return null;
    }
    pass(`${label}.onboard`, `dashboard_ok create=${create.status} done=${done.status}`);
    return { email, token, tenantId: null };
  }
  pass(`${label}.onboard`, `tenant=${tenant.id}`);
  return { email, token, tenantId: tenant.id };
}

async function seedTenantA(token) {
  const tag = randomUUID().slice(0, 8);
  const supplier = await req("POST", "/api/saas/erp/purchases", {
    token,
    body: {
      action: "create_supplier",
      name: `Supplier-A-${tag}`,
      category: "ab-isolation",
      paymentTermsNote: "Net 30 A-only",
    },
  });
  if (supplier.status !== 201 || !supplier.json?.supplier?.id) {
    fail("A.seed.supplier", `HTTP ${supplier.status}`);
    return null;
  }
  pass("A.seed.supplier", supplier.json.supplier.id);

  const sku = `SKU-A-${tag}`;
  const product = await req("POST", "/api/saas/erp/inventory", {
    token,
    body: { action: "create_product", sku, name: `Product A ${tag}`, uom: "u" },
  });
  const wh = await req("POST", "/api/saas/erp/inventory", {
    token,
    body: { action: "create_warehouse", code: `WH-A-${tag}`, name: "Warehouse A" },
  });
  const whId = wh.json?.warehouse?.id;
  const loc = await req("POST", "/api/saas/erp/inventory", {
    token,
    body: { action: "create_location", warehouseId: whId, code: `LOC-A-${tag}` },
  });
  const locId = loc.json?.location?.id;
  const recv = await req("POST", "/api/saas/erp/inventory", {
    token,
    body: {
      action: "receive",
      productSku: sku,
      toLocId: locId,
      qty: 100,
      idempotencyKey: `ab-recv-a-${tag}`,
    },
  });
  if (product.status !== 201 || !whId || !locId || recv.status !== 201) {
    fail(
      "A.seed.inventory",
      `product=${product.status} wh=${wh.status} loc=${loc.status} recv=${recv.status}`,
    );
    return null;
  }
  pass("A.seed.inventory", `sku=${sku} loc=${locId} qty=100`);

  const bom = await req("POST", "/api/saas/erp/manufacturing", {
    token,
    body: {
      action: "create_bom",
      productSku: `FG-A-${tag}`,
      lines: [{ componentSku: sku, qty: 1, uom: "u" }],
    },
  });
  const bomId = bom.json?.bom?.id;
  const approved = await req("POST", "/api/saas/erp/manufacturing", {
    token,
    body: { action: "approve_bom", bomId },
  });
  const mo = await req("POST", "/api/saas/erp/manufacturing", {
    token,
    body: { action: "create_mo", bomId, qty: 2 },
  });
  if (!bomId || approved.status >= 400 || mo.status !== 201) {
    fail("A.seed.mfg", `bom=${bom.status} approve=${approved.status} mo=${mo.status}`);
    return null;
  }
  pass("A.seed.mfg", `bom=${bomId} mo=${mo.json?.manufacturingOrder?.id}`);

  const project = await req("POST", "/api/saas/erp/projects-fs", {
    token,
    body: { action: "create_project", name: `Project-A-${tag}` },
  });
  if (project.status !== 201 || !project.json?.project?.id) {
    fail("A.seed.projects", `HTTP ${project.status}`);
    return null;
  }
  pass("A.seed.projects", project.json.project.id);

  return {
    tag,
    supplierId: supplier.json.supplier.id,
    supplierName: supplier.json.supplier.name,
    sku,
    locId,
    warehouseId: whId,
    bomId,
    moId: mo.json.manufacturingOrder.id,
    projectId: project.json.project.id,
  };
}

function idsIn(list, id) {
  return (list ?? []).some((x) => x?.id === id);
}

async function assertBCannotSeeOrTouch(tokenB, seedA) {
  const purchases = await req("GET", "/api/saas/erp/purchases", { token: tokenB });
  if (purchases.status !== 200) {
    fail("B.get.purchases", `HTTP ${purchases.status}`);
  } else if (idsIn(purchases.json?.suppliers, seedA.supplierId)) {
    fail("B.isolation.purchases.list", "B listed A's supplier");
  } else {
    pass("B.isolation.purchases.list", "A supplier absent");
  }

  const inv = await req("GET", "/api/saas/erp/inventory", { token: tokenB });
  if (inv.status !== 200) {
    fail("B.get.inventory", `HTTP ${inv.status}`);
  } else {
    const skus = (inv.json?.products ?? []).map((p) => p.sku);
    const locs = (inv.json?.locations ?? []).map((l) => l.id);
    if (skus.includes(seedA.sku) || locs.includes(seedA.locId)) {
      fail("B.isolation.inventory.list", "A sku/loc leaked into B GET");
    } else {
      pass("B.isolation.inventory.list", "A inventory absent");
    }
  }

  const mfg = await req("GET", "/api/saas/erp/manufacturing", { token: tokenB });
  if (mfg.status !== 200) {
    fail("B.get.mfg", `HTTP ${mfg.status}`);
  } else if (
    idsIn(mfg.json?.boms, seedA.bomId) ||
    idsIn(mfg.json?.manufacturingOrders, seedA.moId)
  ) {
    fail("B.isolation.mfg.list", "A BOM/MO leaked");
  } else {
    pass("B.isolation.mfg.list", "A mfg absent");
  }

  const projects = await req("GET", "/api/saas/erp/projects-fs", { token: tokenB });
  if (projects.status !== 200) {
    fail("B.get.projects", `HTTP ${projects.status}`);
  } else if (idsIn(projects.json?.projects, seedA.projectId)) {
    fail("B.isolation.projects.list", "A project leaked");
  } else {
    pass("B.isolation.projects.list", "A project absent");
  }

  // Cross-tenant mutate attempts (B using A's ids)
  const crossRecv = await req("POST", "/api/saas/erp/inventory", {
    token: tokenB,
    body: {
      action: "receive",
      productSku: seedA.sku,
      toLocId: seedA.locId,
      qty: 1,
      idempotencyKey: `ab-cross-recv-${seedA.tag}`,
    },
  });
  if (crossRecv.status === 201) {
    fail("B.mutate.receive_A_loc", "B received into A's location");
  } else {
    pass("B.mutate.receive_A_loc", `blocked HTTP ${crossRecv.status} code=${crossRecv.json?.code}`);
  }

  const crossReserve = await req("POST", "/api/saas/erp/inventory", {
    token: tokenB,
    body: {
      action: "reserve",
      productSku: seedA.sku,
      locationId: seedA.locId,
      qty: 1,
      orderRef: `ab-cross-${seedA.tag}`,
      idempotencyKey: `ab-cross-rsv-${seedA.tag}`,
    },
  });
  if (crossReserve.status === 201) {
    fail("B.mutate.reserve_A_stock", "B reserved A's stock");
  } else {
    pass(
      "B.mutate.reserve_A_stock",
      `blocked HTTP ${crossReserve.status} code=${crossReserve.json?.code}`,
    );
  }

  const crossMo = await req("POST", "/api/saas/erp/manufacturing", {
    token: tokenB,
    body: { action: "create_mo", bomId: seedA.bomId, qty: 1 },
  });
  if (crossMo.status === 201) {
    fail("B.mutate.create_mo_A_bom", "B created MO on A's BOM");
  } else {
    pass("B.mutate.create_mo_A_bom", `blocked HTTP ${crossMo.status} code=${crossMo.json?.code}`);
  }

  const crossApprove = await req("POST", "/api/saas/erp/manufacturing", {
    token: tokenB,
    body: { action: "approve_bom", bomId: seedA.bomId },
  });
  if (crossApprove.status < 400) {
    fail("B.mutate.approve_A_bom", `unexpected HTTP ${crossApprove.status}`);
  } else {
    pass("B.mutate.approve_A_bom", `blocked HTTP ${crossApprove.status}`);
  }

  const crossTs = await req("POST", "/api/saas/erp/projects-fs", {
    token: tokenB,
    body: {
      action: "create_timesheet",
      projectId: seedA.projectId,
      hours: 1,
      rateInternalCents: 1000,
    },
  });
  if (crossTs.status === 201) {
    fail("B.mutate.timesheet_A_project", "B wrote timesheet on A's project");
  } else {
    pass(
      "B.mutate.timesheet_A_project",
      `blocked HTTP ${crossTs.status} code=${crossTs.json?.code}`,
    );
  }
}

async function assertAIntact(tokenA, seedA) {
  const purchases = await req("GET", "/api/saas/erp/purchases", { token: tokenA });
  const inv = await req("GET", "/api/saas/erp/inventory", { token: tokenA });
  const mfg = await req("GET", "/api/saas/erp/manufacturing", { token: tokenA });
  const projects = await req("GET", "/api/saas/erp/projects-fs", { token: tokenA });

  const supplierOk = idsIn(purchases.json?.suppliers, seedA.supplierId);
  const bal = (inv.json?.balances ?? []).find(
    (b) => b.locationId === seedA.locId && b.productSku === seedA.sku,
  );
  const stockOk = bal && Number(bal.available) + Number(bal.reserved ?? 0) >= 100;
  const moOk = idsIn(mfg.json?.manufacturingOrders, seedA.moId);
  const projectOk = idsIn(projects.json?.projects, seedA.projectId);

  if (supplierOk && stockOk && moOk && projectOk) {
    pass("A.intact_after_B_attacks", `stock available=${bal.available} reserved=${bal.reserved ?? 0}`);
  } else {
    fail(
      "A.intact_after_B_attacks",
      `supplier=${supplierOk} stock=${stockOk} mo=${moOk} project=${projectOk}`,
    );
  }
}

function writeEvidence(verdict) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const now = new Date();
  const md = `# ERP HTTP Tenant A/B isolation (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | ${now.toISOString()} |
| Verdict | **${verdict}** |
| Base | ${BASE} |
| Critical fails | ${CRITICAL.length} |
| Checks | ${RESULTS.length} (pass ${RESULTS.filter((r) => r.ok).length}) |

## Honesty

- Two ephemeral SaaS users via \`/api/auth/register\` + onboarding (JWT → tenant.id).
- \`X-Workspace-Id\` is **not** used for SaaS ERP isolation (\`requireSaasContext\`).
- Reserve/receive/MO/timesheet cross-tenant mutate attempts must not succeed.
- Payments / IoT / e-signature remain **BLOCKED_***.

## Results

${RESULTS.map((r) => `- ${r.ok ? "PASS" : "FAIL"} \`${r.check}\`: ${r.detail}`).join("\n")}
`;
  const latest = path.join(EVIDENCE_DIR, "erp.http_ab_isolation_latest.md");
  writeFileSync(latest, md, "utf8");
  writeFileSync(
    path.join(EVIDENCE_DIR, `erp.http_ab_isolation_${now.toISOString().replace(/[:.]/g, "-")}.md`),
    md,
    "utf8",
  );
  writeFileSync(
    path.join(EVIDENCE_DIR, "erp.http_ab_isolation_latest.json"),
    JSON.stringify({ verdict, base: BASE, at: now.toISOString(), results: RESULTS, critical: CRITICAL }, null, 2),
    "utf8",
  );
  console.log(`evidence → ${latest}`);
}

async function main() {
  console.log(`erp-http-ab base=${BASE}`);
  const userA = await registerAndOnboard("A");
  const userB = await registerAndOnboard("B");
  if (!userA?.token || !userB?.token) {
    writeEvidence("FAIL");
    process.exit(1);
  }

  const seedA = await seedTenantA(userA.token);
  if (!seedA) {
    writeEvidence("FAIL");
    process.exit(1);
  }

  // B should also be able to create own data (proves B tenant works) without seeing A
  const bSupplier = await req("POST", "/api/saas/erp/purchases", {
    token: userB.token,
    body: {
      action: "create_supplier",
      name: `Supplier-B-${seedA.tag}`,
      category: "ab-isolation",
    },
  });
  if (bSupplier.status !== 201) {
    fail("B.seed.own_supplier", `HTTP ${bSupplier.status}`);
  } else {
    pass("B.seed.own_supplier", bSupplier.json.supplier.id);
  }

  await assertBCannotSeeOrTouch(userB.token, seedA);
  await assertAIntact(userA.token, seedA);

  // Symmetric: A must not see B's supplier
  const aList = await req("GET", "/api/saas/erp/purchases", { token: userA.token });
  if (idsIn(aList.json?.suppliers, bSupplier.json?.supplier?.id)) {
    fail("A.isolation.purchases.list", "A listed B's supplier");
  } else {
    pass("A.isolation.purchases.list", "B supplier absent from A");
  }

  const verdict = CRITICAL.length === 0 ? "ALL_PASS" : "FAIL";
  writeEvidence(verdict);
  console.log(verdict === "ALL_PASS" ? "ALL_PASS [erp-ab]" : `FAIL [erp-ab] critical=${CRITICAL.length}`);
  process.exit(verdict === "ALL_PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
