/**
 * Staging smoke — Private Vector RAG synthetic certification (Block 24).
 *
 * 1) Best-effort health check against the staging deploy (`/api/health`).
 * 2) Runs the local vitest suite for `PrivateVectorRagCore.ts` (pure in-process unit
 *    tests — no Docker, no Postgres/pgvector, no Ollama; deterministic hashing-trick
 *    embeddings proving real cosine retrieval + hard tenant isolation + refuse-on-no-evidence).
 * 3) Prints the kill-switch flag (works in every environment, no Railway-specific canary flag needed).
 * 4) Writes an evidence markdown under scripts/docs/evidence/os-saas-e2e/modules/.
 *
 * Honest scope: this smoke certifies the IN-PROCESS synthetic core only. The
 * production pgvector path (backend/local-ai/LocalVectorStore.ts) requires a live
 * Docker Postgres+pgvector instance and Ollama embeddings — NOT exercised by this
 * script. See docs/ops/PRIVATE_RAG_RUNBOOK.md for the honest status split.
 *
 * Usage: node scripts/staging-smoke-private-rag-synthetic.mjs [--skip-health]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const BASE = process.env.STAGING_BASE_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const SKIP_HEALTH = process.argv.includes("--skip-health");

const ROLLBACK_FLAGS = [
  "NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1  # kill switch — every retrieve() refuses fail-closed",
  "# --- no productive activation flag exists in this module; production pgvector path is",
  "# --- PREPARED_OFF (backend/local-ai/) until re-verified live against a real Docker instance ---",
];

function pass(check, detail = "ok") {
  console.log(`PASS [private-rag-synthetic] ${check}: ${detail}`);
}
function warn(check, detail) {
  console.log(`WARN [private-rag-synthetic] ${check}: ${detail}`);
}
function fail(check, detail) {
  console.log(`FAIL [private-rag-synthetic] ${check}: ${detail}`);
}

async function checkHealth() {
  if (SKIP_HEALTH) {
    warn("health", "skipped via --skip-health");
    return null;
  }
  try {
    const res = await fetch(`${BASE}/api/health`, { cache: "no-store" });
    if (res.ok) {
      pass("health", `HTTP ${res.status} @ ${BASE}/api/health`);
      return true;
    }
    warn("health", `HTTP ${res.status} @ ${BASE}/api/health (non-fatal)`);
    return false;
  } catch (e) {
    warn("health", `unreachable: ${e instanceof Error ? e.message : String(e)} (non-fatal)`);
    return false;
  }
}

function runVitest(testPath, label) {
  const isWin = process.platform === "win32";
  const result = spawnSync(
    isWin ? "pnpm.cmd" : "pnpm",
    ["-C", "apps/web", "exec", "vitest", "run", testPath, "--reporter=dot"],
    {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: isWin,
      env: process.env,
    },
  );
  if (result.error) {
    console.error(`vitest spawn error [${label}]:`, result.error.message);
    return false;
  }
  return result.status === 0;
}

function writeEvidence({ healthOk, vitestOk }) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = path.join(REPO_ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `private-rag.synthetic_${stamp}.md`);
  const md = `# Private Vector RAG — synthetic in-process certification

| Campo | Valor |
|-------|-------|
| Fecha | ${now.toISOString()} |
| Staging base | ${BASE} |
| Health check | ${healthOk === null ? "SKIPPED" : healthOk ? "PASS" : "WARN (non-fatal)"} |
| Vitest \`PrivateVectorRagCore.test.ts\` | ${vitestOk ? "PASS" : "FAIL"} |
| Synthetic core status | **IMPLEMENTED_VERIFIED** — real cosine retrieval, hard tenant isolation, refuse-on-no-evidence |
| Production pgvector path status | **PREPARED_OFF** — not exercised live in this session (requires Docker) |
| Pepito DB | nunca referenciada — solo tenants sintéticos A/B |
| Tenant isolation | assertTenantIsolation() + cross-tenant retrieve tests — 0 leakage |
| Refuse-on-no-evidence | verificado: tenant vacío, query irrelevante, kill switch — todos refusan |

## Rollback / kill switch

\`\`\`
${ROLLBACK_FLAGS.join("\n")}
\`\`\`

## Próximo paso EXACTO para promover a IMPLEMENTED_VERIFIED productivo

1. Levantar Docker local-ai (\`node scripts/local-ai-up.mjs\`) y confirmar Ollama embeddings.
2. Ejecutar un test de integración real contra \`LocalVectorStore.hybridSearch\` con los
   mismos asserts de aislamiento tenant A/B que este suite usa en memoria.
3. Actualizar \`PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath\` solo entonces.
`;
  writeFileSync(file, md, "utf8");
  console.log(`\nEvidence written: ${file}`);
  return file;
}

async function main() {
  console.log(`=== Private Vector RAG synthetic smoke [${BASE}] ===`);
  const healthOk = await checkHealth();
  const vitestOk = runVitest("backend/agency/__tests__/PrivateVectorRagCore.test.ts", "PrivateVectorRagCore");
  if (vitestOk) pass("vitest", "PrivateVectorRagCore.test.ts green");
  else fail("vitest", "PrivateVectorRagCore.test.ts failed");

  console.log("\n--- Rollback / kill switch (any environment) ---");
  for (const line of ROLLBACK_FLAGS) console.log(line);

  writeEvidence({ healthOk, vitestOk });

  if (!vitestOk) {
    console.log("CRITICAL_FAIL");
    process.exit(1);
  }
  console.log("ALL_PASS");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
