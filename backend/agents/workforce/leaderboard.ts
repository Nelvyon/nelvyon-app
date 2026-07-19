/**
 * Capability leaderboard — per-capability rankings only (no deceptive global score).
 */

export type CapabilityMetric =
  | "task_success"
  | "exactness"
  | "groundedness"
  | "hallucination_rate"
  | "tool_selection"
  | "tool_success"
  | "security"
  | "compliance"
  | "tenant_isolation"
  | "latency"
  | "steps"
  | "resource_use"
  | "recovery"
  | "consistency"
  | "business_impact";

export type LeaderboardEntry = {
  agentId: string;
  capability: CapabilityMetric;
  version: string;
  score: number;
  baselineScore: number;
  previousScore: number | null;
  source: "eval" | "deterministic_baseline" | "prompt_variant" | "rag_strategy" | "tool_strategy";
  recordedAt: string;
};

const entries: LeaderboardEntry[] = [];

export function recordCapabilityScore(input: Omit<LeaderboardEntry, "recordedAt">): LeaderboardEntry {
  const e: LeaderboardEntry = { ...input, recordedAt: new Date().toISOString() };
  entries.push(e);
  return e;
}

export function leaderboardForCapability(capability: CapabilityMetric, limit = 20): LeaderboardEntry[] {
  const latestByAgent = new Map<string, LeaderboardEntry>();
  for (const e of entries.filter((x) => x.capability === capability)) {
    const prev = latestByAgent.get(e.agentId);
    if (!prev || e.recordedAt > prev.recordedAt) latestByAgent.set(e.agentId, e);
  }
  return [...latestByAgent.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function compareToBaseline(agentId: string, capability: CapabilityMetric): {
  agentId: string;
  capability: CapabilityMetric;
  current: number | null;
  baseline: number | null;
  delta: number | null;
} {
  const rows = entries
    .filter((e) => e.agentId === agentId && e.capability === capability)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const current = rows[0] ?? null;
  return {
    agentId,
    capability,
    current: current?.score ?? null,
    baseline: current?.baselineScore ?? null,
    delta: current ? current.score - current.baselineScore : null,
  };
}

export function listLeaderboardEntries(): LeaderboardEntry[] {
  return [...entries];
}

export function resetLeaderboardForTests(): void {
  entries.length = 0;
}

/** Seed deterministic baselines from eval suite summaries (caller supplies scores). */
export function seedFromEvalSummary(
  rows: Array<{ agentId: string; capability: CapabilityMetric; score: number; version?: string }>,
): void {
  for (const r of rows) {
    recordCapabilityScore({
      agentId: r.agentId,
      capability: r.capability,
      version: r.version ?? "v1",
      score: r.score,
      baselineScore: r.score,
      previousScore: null,
      source: "deterministic_baseline",
    });
  }
}
