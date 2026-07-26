#!/usr/bin/env node
/**
 * Staging ERP dual-write equivalence smoke (ADR-062 Phase 2).
 * Requires NELVYON_ERP_RELATIONAL_DUAL_WRITE=1 on staging tip.
 * Does NOT flip READ path. Optional DB companion probe via DATABASE_URL.
 *
 *   STAGING_QA_ALLOW_DEFAULT=1 node scripts/staging-smoke-erp-dual-write.mjs
 *   railway run -e staging -s ideal-victory -- env DUAL_WRITE_DB_PROBE=1 STAGING_QA_ALLOW_DEFAULT=1 node scripts/staging-smoke-erp-dual-write.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

async function main() {
  console.log(`erp-dual-write base=${BASE}`);
  const tag = randomUUID().slice(0, 8);
  const email = `erp-dw-${tag}@nelvyon.test`;
  const password = "ErpDwPassw0rd!Live99";

  let reg = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    reg = await req("POST", "/api/auth/register", {
      body: { email, password, name: "ERP DW" },
    });
    if (reg.status !== 429) break;
    const waitSec = Number(reg.json?.retryAfter ?? 5);
    await new Promise((r) => setTimeout(r, Math.min(Math.max(waitSec, 1) * 1000, 60_000)));
  }
  const token = reg.json?.token;
  if (!token) {
    fail("register", `HTTP ${reg.status} ${JSON.stringify(reg.json).slice(0, 160)}`);
  } else {
    pass("register", email);
  }

  let tenantId = "";
  if (token) {
    const create = await req("POST", "/api/saas/onboarding", {
      token,
      body: {
        companyName: `ERP-DW-${tag}`,
        industry: "tech",
        plan: "pro",
        step: 4,
        goals: ["erp-dw"],
      },
    });
    const done = await req("POST", "/api/saas/onboarding/complete", {
      token,
      body: { business_name: `ERP-DW-${tag}` },
    });
    const tenant = done.json?.tenant ?? create.json?.tenant;
    tenantId = tenant?.id || "";
    if (!tenantId) {
      const dash = await req("GET", "/api/saas/dashboard", { token });
      if (!dash.status || dash.status >= 400) {
        fail(
          "onboard",
          `create=${create.status} done=${done.status} dash=${dash.status}`,
        );
      } else {
        pass("onboard", `dashboard_ok create=${create.status}`);
      }
    } else {
      pass("onboard", `tenant=${tenantId}`);
    }
  }

  let supplierId = "";
  if (token) {
    const create = await req("POST", "/api/saas/erp/purchases", {
      token,
      body: {
        action: "create_supplier",
        name: `DW Supplier ${tag}`,
        category: "parts",
        paymentTermsNote: "net30",
      },
    });
    supplierId = create.json?.supplier?.id || "";
    if (create.status !== 201 || !supplierId) {
      fail(
        "create_supplier",
        `HTTP ${create.status} ${JSON.stringify(create.json).slice(0, 300)}`,
      );
    } else {
      pass("create_supplier", supplierId);
    }

    const list = await req("GET", "/api/saas/erp/purchases", { token });
    const items = list.json?.suppliers || [];
    const found = items.some((s) => s?.id === supplierId);
    if (!found) {
      fail("list_suppliers_jsonb", `count=${items.length} found=false`);
    } else {
      pass("list_suppliers_jsonb", `count=${items.length} id=${supplierId}`);
    }
  }

  let companionOk = null;
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (process.env.DUAL_WRITE_DB_PROBE === "1" && dbUrl && supplierId) {
    // Resolve tenant from snapshot if onboarding did not return id
    const client = new pg.Client({
      connectionString: dbUrl,
      ssl:
        /supabase|railway|amazonaws|neon/i.test(dbUrl)
          ? { rejectUnauthorized: false }
          : undefined,
    });
    try {
      await client.connect();
      if (!tenantId) {
        const t = await client.query(
          `SELECT tenant_id FROM erp_domain_snapshots
           WHERE domain = 'purchases'
             AND payload->'suppliers' ? $1
           ORDER BY updated_at DESC NULLS LAST
           LIMIT 1`,
          [supplierId],
        );
        tenantId = t.rows[0]?.tenant_id || "";
      }
      if (!tenantId) {
        fail("companion_equivalence", "tenantId unresolved for supplier");
      } else {
        const snap = await client.query(
          `SELECT payload FROM erp_domain_snapshots WHERE tenant_id = $1 AND domain = 'purchases'`,
          [tenantId],
        );
        const payload = snap.rows[0]?.payload || {};
        const snapSuppliers = payload?.suppliers || {};
        const snapCount = Object.keys(snapSuppliers).length;
        const rel = await client.query(
          `SELECT id, name FROM erp_suppliers WHERE tenant_id = $1 AND id = $2::uuid`,
          [tenantId, supplierId],
        );
        const relCountAll = await client.query(
          `SELECT count(*)::int AS n FROM erp_suppliers WHERE tenant_id = $1`,
          [tenantId],
        );
        const relN = relCountAll.rows[0]?.n ?? 0;
        if (rel.rowCount === 1 && relN === snapCount && snapCount >= 1) {
          pass(
            "companion_equivalence",
            `erp_suppliers.id=${supplierId} snapCount=${snapCount} relCount=${relN}`,
          );
          companionOk = true;
        } else {
          fail(
            "companion_equivalence",
            `relRow=${rel.rowCount} snapCount=${snapCount} relCount=${relN}`,
          );
          companionOk = false;
        }
      }
    } catch (e) {
      fail("companion_equivalence", String(e?.message || e).slice(0, 300));
      companionOk = false;
    } finally {
      await client.end().catch(() => null);
    }
  } else {
    pass(
      "companion_probe_skipped",
      "set DUAL_WRITE_DB_PROBE=1 + DATABASE_URL (railway run) for JSONB↔relational",
    );
  }

  const allOk = checks.every((c) => c.ok);
  const verdict = allOk
    ? companionOk === true
      ? "**IMPLEMENTED_VERIFIED (staging dual-write equivalence)**"
      : "**ALL_PASS (API path; DB probe deferred)**"
    : "**FAIL**";

  const md = [
    "# ERP dual-write staging smoke",
    "",
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Fecha | ${new Date().toISOString()} |`,
    `| Base | ${BASE} |`,
    `| Tip expected | 428c6c91+ with ErpRelationalMirror |`,
    `| Tenant | ${tenantId || "n/a"} |`,
    `| Supplier | ${supplierId || "n/a"} |`,
    `| Verdict | ${verdict} |`,
    `| Dual-write flag | NELVYON_ERP_RELATIONAL_DUAL_WRITE=1 staging |`,
    `| Read flip | **OFF** |`,
    `| Prod dual-write | **OFF** |`,
    "",
    "## Checks",
    "",
    "| Check | Result | Detail |",
    "|-------|--------|--------|",
    ...checks.map(
      (c) =>
        `| ${c.name} | ${c.ok ? "PASS" : "FAIL"} | ${String(c.detail).replace(/\|/g, "/")} |`,
    ),
    "",
    "## Notes",
    "",
    "- API SSOT remains `erp_domain_snapshots` JSONB.",
    "- Companion mirror runs in same TX when DUAL_WRITE=1.",
    "- Pepito DB never referenced. Cost incremental 0.",
  ].join("\n");

  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, "erp.dual_write_staging_latest.md"), md);
  const stamped = `erp.dual_write_staging_${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
  fs.writeFileSync(path.join(evidenceDir, stamped), md);
  console.log(`evidence → erp.dual_write_staging_latest.md`);
  console.log(allOk ? "PASS [erp-dw]" : "FAIL [erp-dw]");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
