#!/usr/bin/env node
/**
 * Preflight for Nelvyon local-ai knowledge ingest.
 * Checks: Docker daemon, Postgres on 127.0.0.1:5434, Ollama on 127.0.0.1:11434.
 * Exits non-zero on any failure and prints exact next commands.
 *
 * Usage: node scripts/preflight-local-ai-ingest.mjs
 */
import { spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = join(root, "backend", "local-ai", "benchmarks", "knowledge_ingest_evidence.json");
const composeFile = "backend/local-ai/docker-compose.yml";
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const PG_HOST = "127.0.0.1";
const PG_PORT = 5434;

/** @type {{ id: string, ok: boolean, detail: string }[]} */
const checks = [];
/** @type {string[]} */
const nextCommands = [];

function record(id, ok, detail) {
  checks.push({ id, ok, detail });
  const mark = ok ? "OK" : "FAIL";
  console.log(`[preflight] ${mark} ${id}: ${detail}`);
}

function dockerInfo() {
  const r = spawnSync("docker", ["info"], {
    encoding: "utf8",
    shell: false,
    timeout: 20000,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status === 0 && /Server Version/i.test(out)) {
    return { ok: true, detail: "docker daemon reachable", error: null, raw: out.slice(0, 200) };
  }
  const errLine =
    out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /failed to connect|Cannot connect|error during connect|daemon/i.test(l)) ||
    out.trim().slice(0, 300) ||
    `docker info exit ${r.status ?? "null"}`;
  return { ok: false, detail: errLine, error: errLine, raw: out.slice(0, 400) };
}

function tcpOpen(host, port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const done = (ok, detail) => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve({ ok, detail });
    };
    const timer = setTimeout(() => done(false, `timeout after ${timeoutMs}ms`), timeoutMs);
    socket.on("connect", () => {
      clearTimeout(timer);
      done(true, `tcp ${host}:${port} open`);
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      done(false, err.message || String(err));
    });
  });
}

async function ollamaTags() {
  const url = `${OLLAMA_URL.replace(/\/$/, "")}/api/tags`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, detail: `HTTP ${res.status} from ${url}` };
    }
    const body = await res.json();
    const models = Array.isArray(body?.models) ? body.models.length : 0;
    return { ok: true, detail: `HTTP ${res.status}, models=${models} (${url})` };
  } catch (err) {
    return { ok: false, detail: `${err?.name || "Error"}: ${err?.message || String(err)} (${url})` };
  }
}

function printNext() {
  console.log("");
  console.log("[preflight] Exact next commands (PowerShell):");
  for (const cmd of nextCommands) {
    console.log(`  ${cmd}`);
  }
}

async function main() {
  console.log("[preflight] local-ai knowledge ingest checks");
  console.log(`[preflight] cwd=${root}`);

  const docker = dockerInfo();
  record("docker", docker.ok, docker.detail);
  if (!docker.ok) {
    nextCommands.push("Start Docker Desktop and wait until the engine is running");
    nextCommands.push(`docker compose -f ${composeFile} up -d`);
    nextCommands.push("node scripts/preflight-local-ai-ingest.mjs");
    nextCommands.push('$env:NELVYON_KNOWLEDGE_INGEST="1"; node scripts/nelvyon-knowledge-sync.mjs');
  }

  const pg = await tcpOpen(PG_HOST, PG_PORT);
  record("postgres", pg.ok, pg.detail);
  if (!pg.ok) {
    if (docker.ok) {
      nextCommands.push(`docker compose -f ${composeFile} up -d`);
      nextCommands.push(
        "# wait healthy: docker compose -f backend/local-ai/docker-compose.yml ps",
      );
    }
    if (!nextCommands.some((c) => c.includes("preflight-local-ai-ingest"))) {
      nextCommands.push("node scripts/preflight-local-ai-ingest.mjs");
    }
    if (!nextCommands.some((c) => c.includes("nelvyon-knowledge-sync"))) {
      nextCommands.push('$env:NELVYON_KNOWLEDGE_INGEST="1"; node scripts/nelvyon-knowledge-sync.mjs');
    }
  }

  const ollama = await ollamaTags();
  record("ollama", ollama.ok, ollama.detail);
  if (!ollama.ok) {
    nextCommands.push("Start Ollama (ollama serve) so http://127.0.0.1:11434/api/tags responds");
    nextCommands.push("ollama pull mxbai-embed-large");
    if (!nextCommands.some((c) => c.includes("preflight-local-ai-ingest"))) {
      nextCommands.push("node scripts/preflight-local-ai-ingest.mjs");
    }
  }

  const allOk = checks.every((c) => c.ok);
  const now = new Date().toISOString();
  const blocker = allOk
    ? null
    : !docker.ok
      ? "Docker Desktop daemon not running -- local-ai Postgres (127.0.0.1:5434) unavailable"
      : !pg.ok
        ? "Postgres on 127.0.0.1:5434 not accepting connections"
        : "Ollama on 127.0.0.1:11434 not reachable";

  const evidence = {
    generatedAt: now,
    ok: false,
    verified: false,
    pipeline: [
      "manifest",
      "ingest",
      "embeddings",
      "vector_store",
      "unified_rag",
      "agent_context_engine",
    ],
    checks: {
      manifestBuild: "not_rechecked_this_run",
      ollamaEmbed: ollama.ok ? "http_ok_tags_reachable" : "unreachable",
      localAiPostgres: pg.ok
        ? "tcp_open_5434"
        : docker.ok
          ? "down_port_5434_closed"
          : "down_docker_daemon_not_running",
      ingest: "not_run",
      vectorStoreChunks: null,
      unifiedRagSearch: "not_run_requires_chunks",
      agentContextGrounding: "not_rechecked_this_run",
      preflight: allOk ? "pass" : "fail",
    },
    blocker: allOk
      ? null
      : `${blocker}. Run: node scripts/preflight-local-ai-ingest.mjs`,
    preflight: {
      path: "scripts/preflight-local-ai-ingest.mjs",
      ranAt: now,
      passed: allOk,
      checks,
      nextCommands,
    },
    claimComplete: false,
    dockerInfo: {
      checkedAt: now,
      daemonRunning: docker.ok,
      error: docker.error,
    },
  };

  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`[preflight] wrote ${evidencePath.replace(/\\/g, "/")}`);

  if (!allOk) {
    printNext();
    console.log("[preflight] RESULT=FAIL (ingest blocked)");
    process.exit(1);
  }

  console.log("[preflight] RESULT=PASS — ready for ingest:");
  console.log('  $env:NELVYON_KNOWLEDGE_INGEST="1"; node scripts/nelvyon-knowledge-sync.mjs');
  process.exit(0);
}

main().catch((err) => {
  console.error("[preflight] unexpected error:", err);
  process.exit(1);
});
