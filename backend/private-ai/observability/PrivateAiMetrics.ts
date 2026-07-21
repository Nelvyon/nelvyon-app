/**
 * Lightweight Private AI metrics (process-local) — panel / observability.
 * Complements saas_private_ai_audit (durable) without a parallel product stack.
 */

export type PrivateAiMetricCounters = {
  agentRuns: number;
  agentErrors: number;
  inferenceRuns: number;
  sharedMemoryReads: number;
  sharedMemoryWrites: number;
  ragHits: number;
  mcpToolCalls: number;
  openClawDispatches: number;
  approvalsQueued: number;
};

const counters: PrivateAiMetricCounters = {
  agentRuns: 0,
  agentErrors: 0,
  inferenceRuns: 0,
  sharedMemoryReads: 0,
  sharedMemoryWrites: 0,
  ragHits: 0,
  mcpToolCalls: 0,
  openClawDispatches: 0,
  approvalsQueued: 0,
};

const startedAt = new Date().toISOString();

export function incPrivateAiMetric(key: keyof PrivateAiMetricCounters, by = 1): void {
  counters[key] += by;
}

export function getPrivateAiMetricsSnapshot() {
  return {
    contractVersion: "1.0.0",
    startedAt,
    uptimeSec: Math.round((Date.now() - Date.parse(startedAt)) / 1000),
    counters: { ...counters },
  };
}

export function resetPrivateAiMetricsForTests(): void {
  for (const k of Object.keys(counters) as (keyof PrivateAiMetricCounters)[]) {
    counters[k] = 0;
  }
}
