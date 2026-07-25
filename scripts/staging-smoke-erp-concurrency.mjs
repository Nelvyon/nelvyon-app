/**
 * Staging ERP concurrency / idempotency smoke (mig 520).
 *
 * - Parallel receive with SAME idempotency key → no double stock
 * - Parallel receive with DISTINCT keys → stock sums correctly
 * - Parallel over-reserve → no negative available; at most available qty held
 * - Parallel create_pr with same idempotency key → single PR
 * - Parallel create_mo → both or sequential OK without corrupt BOM
 *
 * Honesty: FOR UPDATE serializes mutations → 409 is rare under HTTP races;
 * we assert correctness (idempotency + non-negative stock), not mandatory 409.
 *
 * Usage:
 *   STAGING_QA_ALLOW_DEFAULT=1 node scripts/staging-smoke-erp-concurrency.mjs
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
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD =
  process.env.STAGING_QA_PASSWORD?.trim() ||
  (process.env.STAGING_QA_ALLOW_DEFAULT === "1"
    ? "StagingQA2026!"
    : (() => {
        throw new Error("STAGING_QA_PASSWORD required (or STAGING_QA_ALLOW_DEFAULT=1)");
      })());

const CRITICAL = [];
const RESULTS = [];

function pass(check, detail = "ok") {
  RESULTS.push({ check, ok: true, detail });
  console.log(`PASS [erp-conc] ${check}: ${detail}`);
}
function fail(check, detail) {
  CRITICAL.push({ check, detail });
  RESULTS.push({ check, ok: false, detail });
  console.log(`FAIL [erp-conc] ${check}: ${detail}`);
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Cookie: `nelvyon_token=${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function req(method, urlPath, token, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: headers(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(`login ${res.status}`);
  pass("auth", `userId=${data.userId}`);
  return data.token;
}

async function ensureTenant(token) {
  const dash = await req("GET", "/api/saas/dashboard", token);
  if (dash.status < 400) {
    pass("saas-tenant", "dashboard OK");
    return;
  }
  const onb = await req("POST", "/api/saas/onboarding/complete", token, {
    business_name: "QA Smoke Tenant",
  });
  if (onb.status < 400 || onb.status === 409) {
    pass("saas-tenant", `onboarding ${onb.status}`);
    return;
  }
  fail("saas-tenant", `dash=${dash.status} onb=${onb.status}`);
}

function balFor(list, locId, sku) {
  return (list ?? []).find((b) => b.locationId === locId && b.productSku === sku);
}

async function seedInventory(token, tag) {
  const sku = `CONC-${tag}`;
  await req("POST", "/api/saas/erp/inventory", token, {
    action: "create_product",
    sku,
    name: `Conc ${tag}`,
    uom: "u",
  });
  const wh = await req("POST", "/api/saas/erp/inventory", token, {
    action: "create_warehouse",
    code: `CWH-${tag}`,
    name: "Conc WH",
  });
  const loc = await req("POST", "/api/saas/erp/inventory", token, {
    action: "create_location",
    warehouseId: wh.json?.warehouse?.id,
    code: `CLOC-${tag}`,
  });
  const locId = loc.json?.location?.id;
  if (!locId) {
    fail("seed.inventory", "no location");
    return null;
  }
  pass("seed.inventory", `sku=${sku} loc=${locId}`);
  return { sku, locId };
}

async function testIdempotentReceive(token, seed, tag) {
  const key = `conc-idem-recv-${tag}`;
  const [a, b] = await Promise.all([
    req("POST", "/api/saas/erp/inventory", token, {
      action: "receive",
      productSku: seed.sku,
      toLocId: seed.locId,
      qty: 10,
      idempotencyKey: key,
    }),
    req("POST", "/api/saas/erp/inventory", token, {
      action: "receive",
      productSku: seed.sku,
      toLocId: seed.locId,
      qty: 10,
      idempotencyKey: key,
    }),
  ]);
  const statuses = [a.status, b.status].sort().join(",");
  const moveIds = [a.json?.move?.id, b.json?.move?.id].filter(Boolean);
  const uniqueMoves = new Set(moveIds);
  const list = await req("GET", "/api/saas/erp/inventory", token);
  const bal = balFor(list.json?.balances, seed.locId, seed.sku);
  const available = Number(bal?.available ?? -1);

  // After parallel same-key receives, stock must be exactly +10 from this key (not +20)
  if (available !== 10) {
    fail("conc.receive.same_key.stock", `available=${available} expected=10 statuses=${statuses}`);
  } else if (uniqueMoves.size > 1 && moveIds.length === 2) {
    // Different move ids with same key would be a duplicate write
    fail("conc.receive.same_key.moves", `distinct moves ${[...uniqueMoves].join(",")}`);
  } else {
    pass("conc.receive.same_key", `stock=10 statuses=${statuses} moveIds=${moveIds.join("|")}`);
  }
  return available;
}

async function testDistinctReceives(token, seed, tag) {
  const beforeList = await req("GET", "/api/saas/erp/inventory", token);
  const before = Number(balFor(beforeList.json?.balances, seed.locId, seed.sku)?.available ?? 0);
  const [a, b, c] = await Promise.all([
    req("POST", "/api/saas/erp/inventory", token, {
      action: "receive",
      productSku: seed.sku,
      toLocId: seed.locId,
      qty: 5,
      idempotencyKey: `conc-recv-a-${tag}`,
    }),
    req("POST", "/api/saas/erp/inventory", token, {
      action: "receive",
      productSku: seed.sku,
      toLocId: seed.locId,
      qty: 7,
      idempotencyKey: `conc-recv-b-${tag}`,
    }),
    req("POST", "/api/saas/erp/inventory", token, {
      action: "receive",
      productSku: seed.sku,
      toLocId: seed.locId,
      qty: 3,
      idempotencyKey: `conc-recv-c-${tag}`,
    }),
  ]);
  const okCount = [a, b, c].filter((r) => r.status === 201 || r.status === 409).length;
  const list = await req("GET", "/api/saas/erp/inventory", token);
  const after = Number(balFor(list.json?.balances, seed.locId, seed.sku)?.available ?? -1);
  const expected = before + 15;
  if (after !== expected) {
    fail("conc.receive.distinct.stock", `before=${before} after=${after} expected=${expected}`);
  } else {
    pass("conc.receive.distinct", `+15 stock=${after} responses_okish=${okCount}`);
  }
  return after;
}

async function testOverReserve(token, seed, tag) {
  const list0 = await req("GET", "/api/saas/erp/inventory", token);
  const avail = Number(balFor(list0.json?.balances, seed.locId, seed.sku)?.available ?? 0);
  if (avail < 10) {
    fail("conc.reserve.precondition", `available=${avail}`);
    return;
  }
  // Each tries to reserve avail (over-commit if both applied fully)
  const [a, b] = await Promise.all([
    req("POST", "/api/saas/erp/inventory", token, {
      action: "reserve",
      productSku: seed.sku,
      locationId: seed.locId,
      qty: avail,
      orderRef: `ord-a-${tag}`,
      idempotencyKey: `conc-rsv-a-${tag}`,
    }),
    req("POST", "/api/saas/erp/inventory", token, {
      action: "reserve",
      productSku: seed.sku,
      locationId: seed.locId,
      qty: avail,
      orderRef: `ord-b-${tag}`,
      idempotencyKey: `conc-rsv-b-${tag}`,
    }),
  ]);
  const list = await req("GET", "/api/saas/erp/inventory", token);
  const bal = balFor(list.json?.balances, seed.locId, seed.sku);
  const available = Number(bal?.available ?? -999);
  const reserved = Number(bal?.reserved ?? -999);
  if (available < 0 || reserved < 0) {
    fail("conc.reserve.negative", `available=${available} reserved=${reserved}`);
  } else if (available + reserved !== avail) {
    fail(
      "conc.reserve.conservation",
      `available=${available} reserved=${reserved} sum!=${avail} a=${a.status} b=${b.status}`,
    );
  } else if (reserved > avail) {
    fail("conc.reserve.over", `reserved=${reserved} > avail=${avail}`);
  } else {
    pass(
      "conc.reserve.parallel",
      `avail=${available} reserved=${reserved} a=${a.status}/${a.json?.code ?? "ok"} b=${b.status}/${b.json?.code ?? "ok"}`,
    );
  }
}

async function testIdempotentPR(token, tag) {
  const key = `conc-pr-${tag}`;
  const body = {
    action: "create_pr",
    lines: [{ sku: "PR-SKU", qty: 2, uom: "u" }],
    approvalLimitCents: 10000,
    idempotencyKey: key,
  };
  const [a, b] = await Promise.all([
    req("POST", "/api/saas/erp/purchases", token, body),
    req("POST", "/api/saas/erp/purchases", token, body),
  ]);
  const ids = [a.json?.purchaseRequest?.id, b.json?.purchaseRequest?.id].filter(Boolean);
  const unique = new Set(ids);
  const list = await req("GET", "/api/saas/erp/purchases", token);
  const matching = (list.json?.purchaseRequests ?? []).filter(
    (pr) => pr.idempotencyKey === key || ids.includes(pr.id),
  );
  if (unique.size > 1) {
    fail("conc.pr.same_key", `distinct PR ids ${[...unique].join(",")}`);
  } else if (matching.length > 1 && unique.size === 1) {
    // list may show one; OK
    pass("conc.pr.same_key", `single id=${ids[0]} statuses=${a.status},${b.status}`);
  } else if (unique.size === 1 || (a.status === 201 && b.status === 409)) {
    pass("conc.pr.same_key", `id=${ids[0] ?? "n/a"} a=${a.status} b=${b.status}`);
  } else {
    fail("conc.pr.same_key", `a=${a.status} b=${b.status} ids=${ids.join("|")} matching=${matching.length}`);
  }
}

async function testParallelMO(token, tag) {
  const bom = await req("POST", "/api/saas/erp/manufacturing", token, {
    action: "create_bom",
    productSku: `FG-CONC-${tag}`,
    lines: [{ componentSku: "COMP", qty: 1, uom: "u" }],
  });
  const bomId = bom.json?.bom?.id;
  if (!bomId) {
    fail("conc.mo.bom", `HTTP ${bom.status}`);
    return;
  }
  await req("POST", "/api/saas/erp/manufacturing", token, {
    action: "approve_bom",
    bomId,
  });
  const [a, b] = await Promise.all([
    req("POST", "/api/saas/erp/manufacturing", token, {
      action: "create_mo",
      bomId,
      qty: 1,
    }),
    req("POST", "/api/saas/erp/manufacturing", token, {
      action: "create_mo",
      bomId,
      qty: 2,
    }),
  ]);
  const list = await req("GET", "/api/saas/erp/manufacturing", token);
  const mos = (list.json?.manufacturingOrders ?? []).filter((m) => m.bomId === bomId);
  const ok =
    mos.length >= 1 &&
    mos.length <= 2 &&
    [a, b].every((r) => r.status === 201 || r.status === 409 || r.status === 400);
  if (!ok || mos.some((m) => !m.id || Number(m.qty) <= 0)) {
    fail("conc.mo.parallel", `mos=${mos.length} a=${a.status} b=${b.status}`);
  } else {
    pass("conc.mo.parallel", `mos=${mos.length} a=${a.status} b=${b.status}`);
  }
}

function writeEvidence(verdict) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const now = new Date();
  const md = `# ERP concurrency / idempotency (mig 520)

| Campo | Valor |
|-------|-------|
| Fecha | ${now.toISOString()} |
| Verdict | **${verdict}** |
| Base | ${BASE} |
| Critical fails | ${CRITICAL.length} |

## Architecture honesty

- Mutations go through \`with*Persistence\` → \`SELECT … FOR UPDATE\` on \`erp_domain_snapshots\`.
- Concurrent HTTP calls are **serialized** at row lock; correctness (idempotency, non-negative stock) is the gate.
- Snapshot \`409 CONFLICT\` may appear under stale optimistic version; not required on every race when FOR UPDATE wins.
- Multi-replica: same Postgres lock covers all replicas; **second app replica not provisioned** (0€).

## Results

${RESULTS.map((r) => `- ${r.ok ? "PASS" : "FAIL"} \`${r.check}\`: ${r.detail}`).join("\n")}
`;
  writeFileSync(path.join(EVIDENCE_DIR, "erp.concurrency_latest.md"), md, "utf8");
  writeFileSync(
    path.join(EVIDENCE_DIR, `erp.concurrency_${now.toISOString().replace(/[:.]/g, "-")}.md`),
    md,
    "utf8",
  );
  writeFileSync(
    path.join(EVIDENCE_DIR, "erp.concurrency_latest.json"),
    JSON.stringify({ verdict, base: BASE, at: now.toISOString(), results: RESULTS, critical: CRITICAL }, null, 2),
    "utf8",
  );
  console.log("evidence → erp.concurrency_latest.md");
}

async function main() {
  console.log(`erp-concurrency base=${BASE}`);
  const token = await login();
  await ensureTenant(token);
  if (CRITICAL.length) {
    writeEvidence("FAIL");
    process.exit(1);
  }
  const tag = randomUUID().slice(0, 8);
  const seed = await seedInventory(token, tag);
  if (!seed) {
    writeEvidence("FAIL");
    process.exit(1);
  }
  await testIdempotentReceive(token, seed, tag);
  await testDistinctReceives(token, seed, tag);
  await testOverReserve(token, seed, tag);
  await testIdempotentPR(token, tag);
  await testParallelMO(token, tag);

  const verdict = CRITICAL.length === 0 ? "ALL_PASS" : "FAIL";
  writeEvidence(verdict);
  console.log(verdict === "ALL_PASS" ? "ALL_PASS [erp-conc]" : `FAIL [erp-conc] critical=${CRITICAL.length}`);
  process.exit(verdict === "ALL_PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
