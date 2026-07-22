import type { LatencyBucket, ModelSlot, RouterExecutionMeta, RouterTimingBreakdown } from "./types";

export type LatencyBucketStats = {
  bucket: LatencyBucket;
  count: number;
  avgMs: number;
  p95Ms: number;
  thresholdMs: number;
  stable: boolean;
  coldStartCount?: number;
  coldStartAvgMs?: number;
};

export type LatencyGateReport = {
  /** Legacy aggregate — informational only; not used for pass/fail. */
  aggregate: { count: number; avgMs: number; p95Ms: number; stable: boolean };
  buckets: LatencyBucketStats[];
  /** All per-class gates + queue gate must pass. */
  latencyStable: boolean;
};

const BUCKETS: LatencyBucket[] = ["fast_simple", "fast_rag", "strategy", "fallback", "queue"];

export function classifyLatencyBucket(
  meta: Pick<RouterExecutionMeta, "fallbackUsed" | "taskType" | "ragSources" | "initialModel" | "timing">,
): LatencyBucket {
  if (meta.fallbackUsed) return "fallback";
  const slot = meta.timing?.modelSlot;
  const isStrategy =
    slot === "strategy" ||
    meta.taskType === "strategy" ||
    meta.taskType === "planning" ||
    /8b|strategy/i.test(meta.initialModel);
  if (isStrategy) return "strategy";
  if (meta.ragSources.length > 0) return "fast_rag";
  return "fast_simple";
}

function p95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted.at(-1) ?? 0;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Steady-state latency — excludes model swap, queue and gate wait (expected cold paths). */
export function steadyStateMs(record: RouterExecutionMeta): number {
  const t = record.timing;
  if (t) return t.inferenceMs + t.ragMs + t.memoryMs + t.validationMs;
  return record.durationMs;
}

/** Per-bucket stability on steady-state latency: p95 < avg×3 (same strict rule, within class). */
export function evaluateBucketStability(bucket: LatencyBucket, records: RouterExecutionMeta[]): LatencyBucketStats {
  const durationsMs = records.map(steadyStateMs);
  const count = durationsMs.length;
  const avgMs = Math.round(avg(durationsMs));
  const p95Ms = Math.round(p95(durationsMs));
  const thresholdMs = Math.round(avgMs * 3);
  const stable = count < 2 || p95Ms < thresholdMs;
  const coldStarts = records.filter((r) => r.timing?.coldStart);
  return {
    bucket,
    count,
    avgMs,
    p95Ms,
    thresholdMs,
    stable,
    ...(coldStarts.length
      ? {
          coldStartCount: coldStarts.length,
          coldStartAvgMs: Math.round(avg(coldStarts.map((r) => r.durationMs))),
        }
      : {}),
  };
}

/**
 * Queue gate: samples with queueWaitMs>0 — detects cola degradation, not model cold start.
 * Uses queue wait times only (not total task duration).
 */
export function evaluateQueueGate(records: RouterExecutionMeta[]): LatencyBucketStats {
  const waits = records.map((r) => r.timing?.queueWaitMs ?? 0).filter((w) => w > 0);
  if (!waits.length) {
    return { bucket: "queue", count: 0, avgMs: 0, p95Ms: 0, thresholdMs: 0, stable: true };
  }
  const pseudo = waits.map((w) => ({ durationMs: w } as RouterExecutionMeta));
  return evaluateBucketStability("queue", pseudo);
}

export function evaluateLatencyGates(records: RouterExecutionMeta[]): LatencyGateReport {
  const byBucket = new Map<LatencyBucket, RouterExecutionMeta[]>();
  for (const b of BUCKETS) byBucket.set(b, []);

  for (const r of records) {
    const bucket = r.latencyBucket ?? classifyLatencyBucket(r);
    byBucket.get(bucket)?.push(r);
  }

  const buckets: LatencyBucketStats[] = ["fast_simple", "fast_rag", "strategy", "fallback"].map((b) =>
    evaluateBucketStability(b as LatencyBucket, byBucket.get(b as LatencyBucket) ?? []),
  );

  buckets.push(evaluateQueueGate(records));

  const allSteady = records.map(steadyStateMs);
  const aggregateAvg = Math.round(avg(allSteady));
  const aggregateP95 = Math.round(p95(allSteady));
  const aggregate = {
    count: allSteady.length,
    avgMs: aggregateAvg,
    p95Ms: aggregateP95,
    stable: allSteady.length < 2 || aggregateP95 < aggregateAvg * 3,
  };

  const latencyStable = buckets.every((b) => b.stable);

  return { aggregate, buckets, latencyStable };
}

export function modelSlotFromMeta(meta: Pick<RouterExecutionMeta, "initialModel" | "taskType">): ModelSlot {
  if (meta.taskType === "strategy" || meta.taskType === "planning" || /8b|strategy/i.test(meta.initialModel)) {
    return "strategy";
  }
  return "fast";
}

export function emptyTiming(totalMs: number, modelSlot: ModelSlot): RouterTimingBreakdown {
  return {
    queueWaitMs: 0,
    routingMs: 0,
    ragMs: 0,
    memoryMs: 0,
    gateWaitMs: 0,
    modelLoadMs: 0,
    inferenceMs: 0,
    validationMs: 0,
    totalMs,
    coldStart: false,
    modelLoadedBefore: null,
    modelSlot,
    circuitOpenAtStart: false,
  };
}
