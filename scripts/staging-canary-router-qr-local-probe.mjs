/**
 * Local Option C probe — Router + Quality Routing 3b/8b (CEO staging canary).
 * Cost 0 · no OpenAI · does not mutate Railway prod.
 * Exit 0 = PASS · non-zero = FAIL
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const env = {
  NELVYON_AI_ENABLED: "1",
  OLLAMA_CONFIGURED: "1",
  OLLAMA_HOST: "http://127.0.0.1:11434",
  OLLAMA_BASE_URL: "http://127.0.0.1:11434",
  NELVYON_LOCAL_ROUTER_ENABLED: "1",
  AUTONOMOUS_QUALITY_ROUTING: "1",
  OLLAMA_MODEL: "llama3.2:3b-instruct-q4_K_M",
  OLLAMA_STRATEGY_MODEL: "llama3.1:8b-instruct-q4_K_M",
  AUTONOMOUS_ALLOW_OPENAI: "0",
};

function fail(msg) {
  console.error(`[canary-local] FAIL ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[canary-local] OK ${msg}`);
}

// 1) Ollama tags
const tagsRes = await fetch("http://127.0.0.1:11434/api/tags", {
  signal: AbortSignal.timeout(5000),
}).catch((e) => fail(`ollama_unreachable: ${e.message}`));
if (!tagsRes?.ok) fail(`ollama_tags_http_${tagsRes?.status}`);
const tags = await tagsRes.json();
const names = (tags.models || []).map((m) => m.name);
const need = ["llama3.2:3b-instruct-q4_K_M", "llama3.1:8b-instruct-q4_K_M"];
for (const n of need) {
  if (!names.includes(n)) fail(`model_missing:${n}`);
}
ok(`ollama_models ${need.join(",")}`);

// 2) Unit ADR-036 + prep (vitest) — clean OLLAMA_* so prep tests see unset host
const vitestEnv = { ...process.env };
for (const k of [
  "OLLAMA_HOST",
  "OLLAMA_BASE_URL",
  "NELVYON_LOCAL_AI_URL",
  "LOCAL_AI_BASE_URL",
  "AUTONOMOUS_QUALITY_ROUTING",
  "OLLAMA_MODEL",
  "OLLAMA_STRATEGY_MODEL",
  "OLLAMA_CONFIGURED",
  "NELVYON_LOCAL_ROUTER_ENABLED",
]) {
  delete vitestEnv[k];
}
const vitest = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  [
    "-C",
    "apps/web",
    "exec",
    "vitest",
    "run",
    "backend/autonomous/__tests__/qualityRouting.test.ts",
    "backend/local-ai/__tests__/OllamaRuntimePrep.test.ts",
    "--reporter=dot",
  ],
  { cwd: root, env: vitestEnv, encoding: "utf8", shell: true },
);
process.stdout.write(vitest.stdout || "");
process.stderr.write(vitest.stderr || "");
if (vitest.status !== 0) fail(`vitest_exit_${vitest.status}`);
ok("vitest_qualityRouting_OllamaRuntimePrep");

// 3) Model resolution mirror (must match llmAdapter ADR-036)
function resolveModel(agentId) {
  if (env.AUTONOMOUS_QUALITY_ROUTING !== "1") {
    return { slot: "fast", reason: "quality_routing_off" };
  }
  const critical = new Set([
    "agent-copywriter-landing",
    "agent-designer-landing",
    "agent-seo-landing",
    "agent-copywriter-chatbot",
    "agent-copywriter-seo",
    "agent-seo-audit",
    "agent-seo-report",
    "agent-strategist-landing",
    "agent-strategist-seo",
  ]);
  if (critical.has(agentId)) {
    return {
      slot: "strategy",
      model: env.OLLAMA_STRATEGY_MODEL,
      reason: "critical_deliverable_8b",
    };
  }
  return { slot: "fast", model: env.OLLAMA_MODEL, reason: "fast_path_3b" };
}

const crit = resolveModel("agent-copywriter-landing");
const fast = resolveModel("agent-pm-landing");
if (crit.model !== env.OLLAMA_STRATEGY_MODEL || crit.slot !== "strategy") {
  fail(`critical_not_8b:${JSON.stringify(crit)}`);
}
if (fast.model !== env.OLLAMA_MODEL || fast.slot !== "fast") {
  fail(`pm_not_3b:${JSON.stringify(fast)}`);
}
ok(`routing_critical=${crit.model}`);
ok(`routing_fast=${fast.model}`);

// 4) Tiny generate probes (prove both models respond — not pack QA)
async function probeGenerate(model) {
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: 'Reply with exactly: {"ok":true}',
      stream: false,
      options: { num_predict: 24, temperature: 0 },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) fail(`generate_${model}_http_${res.status}`);
  const body = await res.json();
  const text = String(body.response || "").slice(0, 200);
  if (!text.trim()) fail(`generate_${model}_empty`);
  ok(`generate_${model} len=${text.length}`);
}

await probeGenerate(env.OLLAMA_MODEL);
await probeGenerate(env.OLLAMA_STRATEGY_MODEL);

console.log("[canary-local] ALL_PASS");
console.log(
  JSON.stringify({
    scope: "local_option_c",
    router_flag: "1",
    quality_routing: "1",
    openai: "0",
    models: need,
    railway_staging_inference: "BLOCKED_UNTIL_MESH",
  }),
);
process.exit(0);
