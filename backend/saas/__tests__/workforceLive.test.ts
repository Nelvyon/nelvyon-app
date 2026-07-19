/**
 * Workforce LIVE — Ollama + RAG + memory. Gated by NELVYON_WORKFORCE_LIVE=1
 * (cert harness sets this automatically when Ollama is reachable).
 */

import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const live =
  process.env.NELVYON_WORKFORCE_LIVE === "1" ||
  process.env.NELVYON_WORKFORCE_LIVE === "true" ||
  process.env.NELVYON_WORKFORCE_LIVE_OLLAMA === "1";

describe.skipIf(!live)("Workforce LIVE (Ollama + RAG)", () => {
  it(
    "probes models, generation, memory, RAG grounding",
    async () => {
      process.env.OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b-instruct-q4_K_M";
      process.env.LOCAL_AI_EMBEDDING_MODEL = process.env.LOCAL_AI_EMBEDDING_MODEL || "mxbai-embed-large";
      process.env.LOCAL_AI_EMBEDDING_DIM = process.env.LOCAL_AI_EMBEDDING_DIM || "1024";
      process.env.NELVYON_ORCHESTRATOR_LIVE = "1";

      const { probeOllamaForElite } = await import("../../orchestrator/liveJobExecutor");
      const ollama = await probeOllamaForElite();
      expect(ollama.available, ollama.error).toBe(true);

      const { runLiveEliteE2e } = await import("../../agents/workflows/liveEliteE2e");
      const report = await runLiveEliteE2e({ repoRoot: join(process.cwd(), "../..") });

      const outDir = join(process.cwd(), "../../backend/local-ai/benchmarks");
      mkdirSync(outDir, { recursive: true });
      const artifact = {
        schema: "nelvyon.workforce.live.v1",
        generatedAt: new Date().toISOString(),
        ollama,
        elite: report,
        ok: report.ok && ollama.available,
      };
      writeFileSync(join(outDir, "workforce_live.json"), JSON.stringify(artifact, null, 2), "utf8");

      expect(report.memory.writeOk).toBe(true);
      expect(report.memory.injectionBlocked).toBe(true);
      expect(report.rag.ok, report.rag.reasons?.join("; ")).toBe(true);
      expect(report.workflows.every((w) => w.ok), JSON.stringify(report.workflows)).toBe(true);
      expect(report.ok, report.blockers.join("; ")).toBe(true);
    },
    900_000,
  );
});
