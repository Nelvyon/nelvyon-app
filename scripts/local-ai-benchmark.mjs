#!/usr/bin/env node
/**
 * NELVYON Phase 2 — Ollama model benchmark (owner hardware).
 * Shortlist: 3B-class models + embedding candidates for RTX 3050 6GB.
 *
 * Usage: node scripts/local-ai-benchmark.mjs [--skip-pull]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const SKIP_PULL = process.argv.includes("--skip-pull");
const OUT_DIR = path.join(root, "..", "backend", "local-ai", "benchmarks");
const OUT_FILE = path.join(OUT_DIR, `benchmark_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

/** LLM candidates — fit RTX 3050 6GB (3B Q4). */
const LLM_CANDIDATES = [
  { id: "llama3.2:3b-instruct-q4_K_M", label: "Llama 3.2 3B Instruct Q4" },
  { id: "phi3:mini", label: "Phi-3 Mini 3.8B" },
  { id: "qwen2.5:3b-instruct-q4_K_M", label: "Qwen2.5 3B Instruct Q4" },
];

/** Embedding candidates — 768 dim preferred (schema). */
const EMBED_CANDIDATES = [
  { id: "nomic-embed-text", label: "Nomic Embed Text", expectedDim: 768 },
  { id: "mxbai-embed-large", label: "MxBai Embed Large", expectedDim: 1024 },
];

const PROMPTS = {
  speed: "Resume en 3 frases qué es el marketing digital B2B.",
  spanish: `Escribe un email de ventas en español (España) para una agencia de marketing.
Debe incluir: saludo, propuesta de valor, CTA y tono profesional pero cercano. Máximo 120 palabras.`,
  reasoning: `Un cliente paga 1200€/mes. El coste de servicio es 420€/mes y el margen objetivo es 35% sobre ingresos.
¿Cuánto queda de margen bruto en euros? Responde solo con el número y una frase explicando el cálculo.`,
  tools: `Responde ÚNICAMENTE con JSON válido (sin markdown) con esta forma:
{"tool":"create_campaign","args":{"name":"string","budget_eur":number,"channels":["email","linkedin"]}}
Crea una campaña llamada "Lanzamiento Q3" con presupuesto 2500€ y canales email y linkedin.`,
  context: null, // built dynamically
};

function gpuSnapshot() {
  try {
    const raw = execSync(
      "nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits",
      { encoding: "utf8" },
    ).trim();
    const [used, total, util] = raw.split(",").map((s) => Number(s.trim()));
    return { vramUsedMiB: used, vramTotalMiB: total, gpuUtilPct: util };
  } catch {
    return null;
  }
}

function ramSnapshot() {
  try {
    const raw = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1KB"', {
      encoding: "utf8",
    }).trim();
    return { freeRamMiB: Math.round(Number(raw)) };
  } catch {
    return null;
  }
}

async function ollamaFetch(path, body) {
  const res = await fetch(`${OLLAMA}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Ollama non-JSON (${path}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

async function pullModel(model) {
  if (SKIP_PULL) return;
  console.log(`\n⬇ Pulling ${model}...`);
  const proc = spawnSync("ollama", ["pull", model], { stdio: "inherit", shell: true });
  if (proc.status !== 0) throw new Error(`pull failed: ${model}`);
}

async function unloadModel(model) {
  try {
    await fetch(`${OLLAMA}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, keep_alive: 0 }),
    });
  } catch {}
}

function scoreSpanish(text) {
  let s = 0;
  const lower = text.toLowerCase();
  if (/hola|estimad|buenos|saludos/.test(lower)) s += 15;
  if (/marketing|agencia|propuesta|valor/.test(lower)) s += 15;
  if (/cta|contact|escríb|reserv|agenda|llamad/.test(lower)) s += 15;
  if (text.length > 80 && text.length < 900) s += 15;
  const spanishMarkers = (text.match(/\b(el|la|de|en|y|para|con|un|una|es|por)\b/gi) ?? []).length;
  if (spanishMarkers >= 8) s += 20;
  if (!/\b(the|and|with|your company)\b/i.test(text)) s += 10;
  if (/[áéíóúñ¿¡]/.test(text)) s += 10;
  return Math.min(100, s);
}

function scoreReasoning(text) {
  let s = 0;
  const nums = text.match(/\d+[.,]?\d*/g) ?? [];
  if (nums.some((n) => n.replace(",", ".") === "780" || n === "780")) s += 50;
  else if (nums.some((n) => parseFloat(n.replace(",", ".")) === 780)) s += 50;
  if (/420|1200|35|margen|ingreso|coste|beneficio/i.test(text)) s += 25;
  if (text.length < 400) s += 15;
  if (/780/.test(text)) s += 10;
  return Math.min(100, s);
}

function scoreTools(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    const j = JSON.parse(cleaned);
    let s = 40;
    if (j.tool === "create_campaign") s += 20;
    if (j.args?.name?.includes("Lanzamiento")) s += 15;
    if (Number(j.args?.budget_eur) === 2500) s += 15;
    const ch = j.args?.channels ?? [];
    if (ch.includes("email") && ch.includes("linkedin")) s += 10;
    return Math.min(100, s);
  } catch {
    return 0;
  }
}

function buildContextPrompt() {
  const filler = "El pipeline de ventas B2B incluye awareness, consideración y decisión. ";
  const block = filler.repeat(40);
  return `${block}
Pregunta final: ¿Cuáles son las 3 etapas del pipeline mencionadas? Responde en una línea.`;
}

async function benchmarkLlm(model) {
  await unloadModel(model.id);
  const gpuBefore = gpuSnapshot();
  const ramBefore = ramSnapshot();
  const results = { model: model.id, label: model.label, tests: {}, gpuBefore, ramBefore };

  for (const [key, prompt] of Object.entries(PROMPTS)) {
    if (key === "context") continue;
    const t0 = performance.now();
    const gpuMid = gpuSnapshot();
    const out = await ollamaFetch("/api/generate", {
      model: model.id,
      prompt,
      stream: false,
      options: { num_predict: key === "tools" ? 256 : 512, temperature: 0.3 },
    });
    const ms = performance.now() - t0;
    const text = out.response ?? "";
    const evalCount = out.eval_count ?? 0;
    const tps = evalCount > 0 ? (evalCount / (ms / 1000)).toFixed(1) : "0";

    results.tests[key] = {
      latencyMs: Math.round(ms),
      tokensOut: evalCount,
      tokensPerSec: Number(tps),
      vramDuring: gpuMid,
      responsePreview: text.slice(0, 400),
    };

    if (key === "spanish") results.tests[key].qualityScore = scoreSpanish(text);
    if (key === "reasoning") results.tests[key].qualityScore = scoreReasoning(text);
    if (key === "tools") results.tests[key].qualityScore = scoreTools(text);
  }

  // Context test
  const ctxPrompt = buildContextPrompt();
  const ctx0 = performance.now();
  const ctxGpu = gpuSnapshot();
  const ctxOut = await ollamaFetch("/api/generate", {
    model: model.id,
    prompt: ctxPrompt,
    stream: false,
    options: { num_predict: 128, temperature: 0.1 },
  });
  const ctxMs = performance.now() - ctx0;
  const ctxText = ctxOut.response ?? "";
  let ctxScore = 0;
  if (/awareness|consideraci|decisi/i.test(ctxText)) ctxScore += 50;
  if (/3|tres|etapa/i.test(ctxText)) ctxScore += 30;
  if (ctxText.length < 200) ctxScore += 20;
  results.tests.context = {
    latencyMs: Math.round(ctxMs),
    promptChars: ctxPrompt.length,
    qualityScore: Math.min(100, ctxScore),
    vramDuring: ctxGpu,
    responsePreview: ctxText.slice(0, 200),
  };

  results.gpuAfter = gpuSnapshot();
  results.ramAfter = ramSnapshot();
  results.composite = computeLlmComposite(results);
  await unloadModel(model.id);
  return results;
}

function computeLlmComposite(r) {
  const speed = r.tests.speed?.tokensPerSec ?? 0;
  const speedScore = Math.min(100, (speed / 40) * 100);
  const spanish = r.tests.spanish?.qualityScore ?? 0;
  const reasoning = r.tests.reasoning?.qualityScore ?? 0;
  const tools = r.tests.tools?.qualityScore ?? 0;
  const context = r.tests.context?.qualityScore ?? 0;
  const vram = r.gpuAfter?.vramUsedMiB ?? 9999;
  const vramScore = vram <= 4500 ? 100 : vram <= 5500 ? 70 : 40;

  const total =
    speedScore * 0.2 + spanish * 0.2 + reasoning * 0.2 + tools * 0.15 + context * 0.15 + vramScore * 0.1;
  return {
    speedScore: Math.round(speedScore),
    spanish,
    reasoning,
    tools,
    context,
    vramScore,
    total: Math.round(total * 10) / 10,
  };
}

async function benchmarkEmbed(model) {
  const samples = [
    "NELVYON es una agencia de marketing digital operada por IA.",
    "El cliente necesita una campaña de email marketing B2B en español.",
    "Vector search with pgvector for tenant-isolated RAG documents.",
  ];
  const t0 = performance.now();
  const gpuMid = gpuSnapshot();
  let dim = 0;
  let ok = 0;
  for (const input of samples) {
    let vec;
    try {
      const r = await ollamaFetch("/api/embeddings", { model: model.id, prompt: input });
      vec = r.embedding;
    } catch {
      const r = await ollamaFetch("/api/embed", { model: model.id, input });
      vec = Array.isArray(r.embeddings?.[0]) ? r.embeddings[0] : r.embedding;
    }
    if (vec?.length) {
      dim = vec.length;
      ok++;
    }
  }
  const ms = performance.now() - t0;
  const latencyPerEmbed = Math.round(ms / samples.length);
  const dimMatch = dim === model.expectedDim ? 100 : dim === 768 ? 90 : 50;
  const speedScore = latencyPerEmbed < 200 ? 100 : latencyPerEmbed < 500 ? 80 : 50;
  const schemaFit = model.expectedDim === 768 ? 100 : 60;
  return {
    model: model.id,
    label: model.label,
    dim,
    expectedDim: model.expectedDim,
    latencyPerEmbedMs: latencyPerEmbed,
    gpuDuring: gpuMid,
    schemaFitScore: schemaFit,
    speedScore,
    dimMatchScore: dimMatch,
    total: Math.round((speedScore * 0.3 + schemaFit * 0.4 + dimMatch * 0.3) * 10) / 10,
  };
}

async function main() {
  console.log("=== NELVYON Ollama Benchmark ===");
  console.log(`Ollama: ${OLLAMA}`);

  const version = await fetch(`${OLLAMA}/api/version`).then((r) => r.json());
  console.log(`Version: ${version.version}`);
  const gpu = gpuSnapshot();
  console.log(`GPU VRAM: ${gpu?.vramUsedMiB}/${gpu?.vramTotalMiB} MiB used\n`);

  await fs.mkdir(OUT_DIR, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    ollamaVersion: version.version,
    gpu,
    llm: [],
    embed: [],
    winners: {},
  };

  for (const m of LLM_CANDIDATES) {
    await pullModel(m.id);
    console.log(`\n▶ Benchmark LLM: ${m.label}`);
    try {
      const r = await benchmarkLlm(m);
      report.llm.push(r);
      console.log(`  composite=${r.composite.total} tps=${r.tests.speed?.tokensPerSec} vram=${r.gpuAfter?.vramUsedMiB}MiB`);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
      report.llm.push({ model: m.id, error: e.message });
    }
  }

  for (const m of EMBED_CANDIDATES) {
    await pullModel(m.id);
    console.log(`\n▶ Benchmark embed: ${m.label}`);
    try {
      const r = await benchmarkEmbed(m);
      report.embed.push(r);
      console.log(`  dim=${r.dim} latency=${r.latencyPerEmbedMs}ms total=${r.total}`);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
      report.embed.push({ model: m.id, error: e.message });
    }
    await unloadModel(m.id);
  }

  const llmOk = report.llm.filter((r) => r.composite);
  llmOk.sort((a, b) => b.composite.total - a.composite.total);
  const embedOk = report.embed.filter((r) => r.total);
  embedOk.sort((a, b) => b.total - a.total);

  report.winners = {
    llm: llmOk[0] ?? null,
    embed: embedOk[0] ?? null,
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n=== BENCHMARK_DONE ===`);
  console.log(`Report: ${OUT_FILE}`);
  if (report.winners.llm) {
    console.log(`LLM winner: ${report.winners.llm.model} (score ${report.winners.llm.composite.total})`);
  }
  if (report.winners.embed) {
    console.log(`Embed winner: ${report.winners.embed.model} (score ${report.winners.embed.total})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
