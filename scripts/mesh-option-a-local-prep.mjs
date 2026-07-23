/**
 * Mesh Option A — local private Ollama prep/verify (PC Tailscale + Ollama).
 * Does not touch production. Does not print auth keys.
 * Exit 0 = local private path PASS · 2 = WAITING_RAILWAY_NODE · 1 = FAIL
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tsBin = "C:\\Program Files\\Tailscale\\tailscale.exe";

function fail(msg) {
  console.error(`[mesh-local] FAIL ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`[mesh-local] OK ${msg}`);
}
function warn(msg) {
  console.log(`[mesh-local] WAIT ${msg}`);
}

if (!fs.existsSync(tsBin)) fail("tailscale_exe_missing");

const ip = spawnSync(tsBin, ["ip", "-4"], { encoding: "utf8" }).stdout.trim().split(/\r?\n/)[0];
if (!ip || !ip.startsWith("100.")) fail(`tailscale_ip_invalid:${ip}`);
ok(`tailscale_ipv4=${ip}`);

const statusJson = spawnSync(tsBin, ["status", "--json"], { encoding: "utf8" });
let peerCount = 0;
let dnsName = "";
try {
  const j = JSON.parse(statusJson.stdout || "{}");
  peerCount = Object.keys(j.Peer || {}).length;
  dnsName = String(j.Self?.DNSName || "").replace(/\.$/, "");
  if (j.Self?.ExitNode) fail("exit_node_enabled_forbidden");
} catch {
  fail("tailscale_status_json");
}
ok(`magicdns=${dnsName || "(none)"}`);
ok(`peer_count=${peerCount}`);

const host = `http://${ip}:11434`;
const started = Date.now();
let tags;
try {
  const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(5000) });
  const latency = Date.now() - started;
  if (!res.ok) fail(`ollama_http_${res.status}`);
  tags = await res.json();
  ok(`ollama_private_health latency_ms=${latency} models=${(tags.models || []).length}`);
} catch (e) {
  fail(`ollama_private_unreachable:${e instanceof Error ? e.message : e}`);
}

const need = ["llama3.2:3b-instruct-q4_K_M", "llama3.1:8b-instruct-q4_K_M"];
const names = (tags.models || []).map((m) => m.name);
for (const n of need) {
  if (!names.includes(n)) fail(`model_missing:${n}`);
}
ok(`models_ok ${need.join(",")}`);

// Unit: mesh host allowlist
const vitestEnv = { ...process.env };
delete vitestEnv.OLLAMA_HOST;
delete vitestEnv.OLLAMA_BASE_URL;
const vitest = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  [
    "-C",
    "apps/web",
    "exec",
    "vitest",
    "run",
    "backend/local-ai/__tests__/OllamaRuntimePrep.test.ts",
    "--reporter=dot",
  ],
  { cwd: root, env: vitestEnv, encoding: "utf8", shell: true },
);
process.stdout.write(vitest.stdout || "");
process.stderr.write(vitest.stderr || "");
if (vitest.status !== 0) fail(`vitest_exit_${vitest.status}`);
ok("ollama_runtime_prep_tests");

const evidenceDir = path.join(root, ".release-logs");
fs.mkdirSync(evidenceDir, { recursive: true });
const evidence = {
  at: new Date().toISOString(),
  scope: "mesh_option_a_local_prep",
  tailscale_ipv4: ip,
  magicdns: dnsName,
  ollama_bind: "tailscale_ip_only",
  peer_count: peerCount,
  railway_node: peerCount > 0 ? "peer_present" : "WAITING_TS_AUTHKEY_ON_STAGING",
  openai: "0",
  production: "untouched",
  funnel_serve_exit_subnet: "forbidden",
};
fs.writeFileSync(
  path.join(evidenceDir, "mesh-option-a-local-prep-20260723.txt"),
  `${JSON.stringify(evidence, null, 2)}\n`,
  "utf8",
);

if (peerCount < 1) {
  warn("Railway staging node not on tailnet yet — create auth key (see docs/ops/MESH_OPTION_A_STAGING.md)");
  console.log("[mesh-local] LOCAL_PRIVATE_PASS_WAITING_RAILWAY_NODE");
  process.exit(2);
}

console.log("[mesh-local] ALL_PASS");
process.exit(0);
