/**
 * Live elite E2E — skipped unless NELVYON_ELITE_LIVE=1 (Ollama required).
 */

import { describe, expect, it } from "vitest";
import { join } from "node:path";

const live = process.env.NELVYON_ELITE_LIVE === "1" || process.env.NELVYON_ELITE_LIVE === "true";

describe.skipIf(!live)("Phase2 Elite LIVE (Ollama)", () => {
  it(
    "runs live workflows + memory + RAG with real embeddings",
    async () => {
      process.env.OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b-instruct-q4_K_M";
      process.env.LOCAL_AI_EMBEDDING_MODEL = process.env.LOCAL_AI_EMBEDDING_MODEL || "mxbai-embed-large";
      process.env.LOCAL_AI_EMBEDDING_DIM = process.env.LOCAL_AI_EMBEDDING_DIM || "1024";
      process.env.NELVYON_ORCHESTRATOR_LIVE = "1";

      const { runLiveEliteE2e } = await import("../../agents/workflows/liveEliteE2e");
      const report = await runLiveEliteE2e({ repoRoot: join(process.cwd(), "../..") });

      // Persist for cert harness
      const { writeFileSync, mkdirSync } = await import("node:fs");
      const out = join(process.cwd(), "../../backend/local-ai/benchmarks/phase2_elite_live.json");
      mkdirSync(join(process.cwd(), "../../backend/local-ai/benchmarks"), { recursive: true });
      writeFileSync(out, JSON.stringify(report, null, 2), "utf8");

      expect(report.ollama.available, report.ollama.error).toBe(true);
      expect(report.memory.writeOk).toBe(true);
      expect(report.memory.injectionBlocked).toBe(true);
      expect(report.rag.ok, report.rag.reasons?.join("; ")).toBe(true);
      expect(report.workflows.length).toBeGreaterThanOrEqual(3);
      expect(
        report.workflows.every((w) => w.ok),
        JSON.stringify(report.workflows),
      ).toBe(true);
      expect(report.ok, report.blockers.join("; ")).toBe(true);
    },
    900_000,
  );
});
