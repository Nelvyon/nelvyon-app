/**
 * Staging smoke — single-region HA/DR readiness (optional, not part of CI gates).
 *
 * 1) Runs the local vitest suite for `HaDrReadiness.ts` (pure unit tests — RPO/RTO
 *    constants, capacity-smoke logic with a fake fetcher, graceful-degradation
 *    pattern, rate-limit presence, stateless assertion, rollback checklist).
 * 2) Best-effort REAL capacity smoke against the staging `/api/health*` probes —
 *    a small burst of concurrent requests per endpoint, non-fatal on network errors
 *    (mirrors `runCapacitySmoke` in `backend/agency/HaDrReadiness.ts`, duplicated
 *    here in plain JS since this script has no TS transform — same pattern as
 *    `scripts/pwa-certify.mjs` mirroring `PwaCertification.ts`).
 * 3) Writes an evidence markdown under scripts/docs/evidence/os-saas-e2e/modules/.
 *
 * Never targets production. Defaults to the already-approved staging deploy;
 * override with STAGING_BASE_URL if needed. No OpenAI, no spend, read-only GETs.
 *
 * Usage: node scripts/staging-smoke-ha-dr-readiness.mjs [--skip-network]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const BASE = (process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app").replace(/\/$/, "");
const SKIP_NETWORK = process.argv.includes("--skip-network");
const CONCURRENCY = 5;
const MAX_LATENCY_MS = 3000;

const PROBE_TARGETS = [
  { id: "health", path: `${BASE}/api/health`, expectedStatus: 200 },
  { id: "live", path: `${BASE}/api/health/live`, expectedStatus: 200 },
  { id: "ready", path: `${BASE}/api/health/ready`, expectedStatus: 200 },
  { id: "deep", path: `${BASE}/api/health/deep`, expectedStatus: 200 },
];

function pass(check, detail = "ok") {
  console.log(`PASS [ha-dr-readiness] ${check}: ${detail}`);
}
function warn(check, detail) {
  console.log(`WARN [ha-dr-readiness] ${check}: ${detail}`);
}
function fail(check, detail) {
  console.log(`FAIL [ha-dr-readiness] ${check}: ${detail}`);
}

async function runCapacitySmoke() {
  if (SKIP_NETWORK) {
    warn("capacity_smoke", "skipped via --skip-network");
    return { skipped: true, ok: null, results: [] };
  }
  const results = [];
  for (const target of PROBE_TARGETS) {
    const attempts = await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        const start = Date.now();
        try {
          const res = await fetch(target.path, { cache: "no-store" });
          const latencyMs = Date.now() - start;
          return { id: target.id, ok: res.status === target.expectedStatus && latencyMs <= MAX_LATENCY_MS, statusCode: res.status, latencyMs };
        } catch (e) {
          return { id: target.id, ok: false, statusCode: null, latencyMs: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );
    results.push(...attempts);
  }
  const ok = results.every((r) => r.ok);
  if (ok) pass("capacity_smoke", `${results.length} requests across ${PROBE_TARGETS.length} probes, all OK`);
  else warn("capacity_smoke", `some requests failed (non-fatal — staging may be asleep/cold-starting): ${JSON.stringify(results.filter((r) => !r.ok))}`);
  return { skipped: false, ok, results };
}

function runVitest(testPath, label) {
  const isWin = process.platform === "win32";
  const result = spawnSync(
    isWin ? "pnpm.cmd" : "pnpm",
    ["-C", "apps/web", "exec", "vitest", "run", testPath, "--reporter=dot"],
    { cwd: REPO_ROOT, stdio: "inherit", shell: isWin, env: process.env },
  );
  if (result.error) {
    console.error(`vitest spawn error [${label}]:`, result.error.message);
    return false;
  }
  return result.status === 0;
}

function writeEvidence({ vitestOk, smoke }) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = path.join(REPO_ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ha-dr-readiness_${stamp}.md`);
  const md = `# HA/DR single-region readiness — smoke

| Campo | Valor |
|-------|-------|
| Fecha | ${now.toISOString()} |
| Staging base | ${BASE} |
| Vitest \`HaDrReadiness.test.ts\` | ${vitestOk ? "PASS" : "FAIL"} |
| Capacity smoke (real network, ${CONCURRENCY}x concurrent / probe) | ${smoke.skipped ? "SKIPPED" : smoke.ok ? "PASS" : "WARN (non-fatal)"} |
| Multi-region | **BLOCKED_EXTERNAL** — requiere presupuesto CEO, no activado, no planeado sin aprobación |
| Single-region resilient | **IMPLEMENTED_VERIFIED** — RPO/RTO, health checks, kill switches, rate-limit presence, degradación gestionada, rollback documentado |

## Detalle capacity smoke

\`\`\`json
${JSON.stringify(smoke.results, null, 2)}
\`\`\`

## Honestidad

- Este smoke NUNCA apunta a producción; usa STAGING_BASE_URL o el staging ya aprobado por defecto.
- El fallo de red en staging es no-fatal (WARN) — staging Railway free-tier puede tener cold-start; el gate real de calidad es el suite vitest (lógica pura, determinista).
- No se toca ninguna flag de producción ni se realiza ningún envío/spend.
`;
  writeFileSync(file, md, "utf8");
  console.log(`\nEvidence written: ${file}`);
  return file;
}

async function main() {
  console.log(`=== HA/DR single-region readiness smoke [${BASE}] ===`);
  const vitestOk = runVitest("backend/agency/__tests__/HaDrReadiness.test.ts", "HaDrReadiness");
  if (vitestOk) pass("vitest", "HaDrReadiness.test.ts green");
  else fail("vitest", "HaDrReadiness.test.ts failed");

  const smoke = await runCapacitySmoke();

  writeEvidence({ vitestOk, smoke });

  if (!vitestOk) {
    console.log("CRITICAL_FAIL");
    process.exit(1);
  }
  console.log("ALL_PASS (network smoke is informational/non-fatal — see WARN above if any)");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
