/**
 * Smoke all OS premium service preview pages + platform shell routes.
 * Usage: node scripts/staging-smoke-os-all-services.mjs [--skip-wait]
 */
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getWorkspaceIdWithFallback } from "./lib/smoke-workspace.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const osAppDir = join(root, "apps/web/src/app/os");

const BASE = process.env.STAGING_BASE_URL?.trim() || "https://nelvyon.com";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const COOKIE = "nelvyon_token";
const SKIP_WAIT = process.argv.includes("--skip-wait");

const PLATFORM_ROUTES = [
  { id: "os-dashboard", href: "/os/dashboard" },
  { id: "os-clientes", href: "/os/clientes" },
  { id: "os-proyectos", href: "/os/proyectos" },
  { id: "os-pipeline", href: "/os/pipeline" },
  { id: "os-tareas", href: "/os/tareas" },
  { id: "os-entregables", href: "/os/entregables" },
  { id: "os-documentos", href: "/os/documentos" },
  { id: "os-finanzas", href: "/os/finanzas" },
  { id: "os-ia", href: "/os/ia" },
  { id: "os-config", href: "/os/configuracion" },
  { id: "os-hub", href: "/os" },
];

const CRITICAL = [];
const WARN = [];

function fail(id, check, detail) {
  CRITICAL.push({ id, check, detail });
  console.log(`FAIL [${id}] ${check}: ${detail}`);
}

function warn(id, check, detail) {
  WARN.push({ id, check, detail });
  console.log(`WARN [${id}] ${check}: ${detail}`);
}

function pass(id, check, detail = "ok") {
  console.log(`PASS [${id}] ${check}: ${detail}`);
}

function discoverServicePreviews() {
  const items = [];
  for (const name of readdirSync(osAppDir)) {
    const previewDir = join(osAppDir, name, "preview");
    try {
      if (statSync(previewDir).isDirectory()) {
        items.push({ id: name, href: `/os/${name}/preview` });
      }
    } catch {
      /* no preview */
    }
  }
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForDeploy() {
  if (SKIP_WAIT) {
    console.log("SKIP deploy wait");
    return;
  }
  for (let i = 1; i <= 6; i += 1) {
    try {
      const h = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      if (h.status === 200) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch {
      /* retry */
    }
    await sleep(10000);
  }
  warn("deploy", "wait", "health timeout — continuing");
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
  pass("auth", "login", `userId=${data.userId}`);
  return data.token;
}

function headers(token, workspaceId) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "text/html,application/json",
    Cookie: `${COOKIE}=${token}`,
    "X-Workspace-Id": workspaceId,
  };
}

async function probePage(mod, token, workspaceId) {
  const pageRes = await fetch(`${BASE}${mod.href}`, {
    headers: headers(token, workspaceId),
    redirect: "manual",
    cache: "no-store",
  });

  if (pageRes.status === 301 || pageRes.status === 302 || pageRes.status === 307 || pageRes.status === 308) {
    const loc = pageRes.headers.get("location") ?? "";
    if (loc.includes("/login")) {
      fail(mod.id, "page", `redirect to login (${pageRes.status})`);
      return;
    }
    pass(mod.id, "page", `redirect ${pageRes.status}`);
    return;
  }

  if (pageRes.status !== 200) {
    fail(mod.id, "page", `HTTP ${pageRes.status}`);
    return;
  }

  const html = await pageRes.text();
  if (/Application error|Internal Server Error|Unhandled Runtime Error/i.test(html)) {
    fail(mod.id, "page", "runtime error in HTML");
    return;
  }
  pass(mod.id, "page", `HTTP 200 (${html.length}b)`);
}

async function main() {
  const services = discoverServicePreviews();
  const modules = [...services, ...PLATFORM_ROUTES];
  console.log(`OS all-services smoke → ${BASE} (${services.length} previews + ${PLATFORM_ROUTES.length} platform)\n`);

  if (services.length < 20) {
    fail("parse", "osPreviews", `expected ≥20 previews, got ${services.length}`);
  } else {
    pass("parse", "osPreviews", `count=${services.length}`);
  }

  await waitForDeploy();
  const token = await login();
  const workspaceId = await getWorkspaceIdWithFallback(BASE, token, pass);

  for (const mod of modules) {
    await probePage(mod, token, workspaceId);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`modules=${modules.length} critical=${CRITICAL.length} warnings=${WARN.length}`);
  if (CRITICAL.length === 0) {
    console.log("ALL_CRITICAL_PASS");
    process.exit(0);
  }
  console.log(JSON.stringify(CRITICAL, null, 2));
  process.exit(1);
}

main().catch((e) => {
  console.error("SMOKE_FATAL", e);
  process.exit(1);
});
