import { describe, expect, it } from "vitest";

import {
  classifyLatencyBucket,
  evaluateLatencyGates,
  steadyStateMs,
} from "../../local-ai/router/latencyMetrics";
import type { RouterExecutionMeta } from "../../local-ai/router/types";

function meta(partial: Partial<RouterExecutionMeta> & Pick<RouterExecutionMeta, "durationMs">): RouterExecutionMeta {
  return {
    taskId: "t",
    tenantId: "x",
    taskType: "simple",
    risk: "low",
    initialModel: "llama3.2:3b-instruct-q4_K_M",
    finalModel: "llama3.2:3b-instruct-q4_K_M",
    modelReason: "test",
    fallbackUsed: false,
    fallbackReasons: [],
    temperature: 0.15,
    ragSources: [],
    validationPass: true,
    validationViolations: [],
    securityBlocked: false,
    ...partial,
  };
}

describe("routerLatencyMetrics", () => {
  it("classifies strategy vs fast_rag vs fast_simple", () => {
    expect(classifyLatencyBucket(meta({ taskType: "strategy", initialModel: "llama3.1:8b-instruct-q4_K_M" }))).toBe(
      "strategy",
    );
    expect(classifyLatencyBucket(meta({ durationMs: 1, ragSources: ["a"] }))).toBe("fast_rag");
    expect(classifyLatencyBucket(meta({ durationMs: 1 }))).toBe("fast_simple");
  });

  it("steadyStateMs excludes model load and waits", () => {
    const m = meta({
      durationMs: 50000,
      timing: {
        queueWaitMs: 0,
        routingMs: 1,
        ragMs: 50,
        memoryMs: 0,
        gateWaitMs: 0,
        modelLoadMs: 6000,
        inferenceMs: 32000,
        validationMs: 1,
        totalMs: 50000,
        coldStart: true,
        modelLoadedBefore: null,
        modelSlot: "strategy",
        circuitOpenAtStart: false,
      },
    });
    expect(steadyStateMs(m)).toBe(32051);
  });

  it("passes per-class gates when mixed cold strategy does not poison fast bucket", () => {
    const records: RouterExecutionMeta[] = [
      meta({ durationMs: 50000, taskType: "strategy", initialModel: "llama3.1:8b-instruct-q4_K_M", latencyBucket: "strategy", timing: { queueWaitMs: 0, routingMs: 0, ragMs: 0, memoryMs: 0, gateWaitMs: 0, modelLoadMs: 6000, inferenceMs: 32000, validationMs: 0, totalMs: 50000, coldStart: true, modelLoadedBefore: "3b", modelSlot: "strategy", circuitOpenAtStart: false } }),
      ...[6000, 5000, 4000, 3000, 2000].map((inferenceMs) =>
        meta({
          durationMs: inferenceMs,
          latencyBucket: "fast_simple",
          timing: { queueWaitMs: 0, routingMs: 0, ragMs: 0, memoryMs: 0, gateWaitMs: 0, modelLoadMs: 0, inferenceMs, validationMs: 0, totalMs: inferenceMs, coldStart: false, modelLoadedBefore: "3b", modelSlot: "fast", circuitOpenAtStart: false },
        }),
      ),
    ];
    const report = evaluateLatencyGates(records);
    expect(report.buckets.find((b) => b.bucket === "strategy")?.stable).toBe(true);
    expect(report.buckets.find((b) => b.bucket === "fast_simple")?.stable).toBe(true);
    expect(report.latencyStable).toBe(true);
  });
});
