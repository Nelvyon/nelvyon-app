/**
 * O28 — OsAgentAuditTrailService unit tests (mock db port)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsAgentAuditTrailService,
  normalizeAgentLogEntry,
  buildTrailSummary,
  computeEventHash,
  type AuditAgentLogEntry,
  type AgentAuditEvent,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): { db: SaasPostgresPort; calls: Array<{ sql: string; params: unknown[] }> } {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const db = {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => { calls.push({ sql, params }); return handler(sql, params); }),
  } as unknown as SaasPostgresPort;
  return { db, calls };
}

function entry(over: Partial<AuditAgentLogEntry> = {}): AuditAgentLogEntry {
  return {
    agent: "copywriter", started_at: "2026-06-01T10:00:00Z", ended_at: "2026-06-01T10:00:05Z",
    input_artifact_versions: { brief: 1 }, output_artifact: "copy", output_version: 2,
    model: "mock-rules-v1", tokens: 1200, llm_mode: "mock", status: "success", ...over,
  };
}

function eventRow(over: Record<string, unknown> = {}) {
  return {
    id: "e1", pack_run_id: "run-1", sku: "NELVYON-LANDING", agent_id: "copywriter", step_order: 0,
    input_artifact_versions: { brief: 1 }, output_artifact: "copy", output_version: 2, model: "mock-rules-v1",
    tokens: 1200, llm_mode: "mock", agent_status: "success", qa_score: 88, qa_passed: true,
    started_at: "2026-06-01T10:00:00Z", ended_at: "2026-06-01T10:00:05Z", metadata: {}, recorded_at: "2026-06-01T10:00:06Z", ...over,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────────

describe("O28 — normalizeAgentLogEntry", () => {
  it("maps all fields with step order", () => {
    const p = normalizeAgentLogEntry(entry(), 3);
    expect(p.agentId).toBe("copywriter");
    expect(p.stepOrder).toBe(3);
    expect(p.outputArtifact).toBe("copy");
    expect(p.outputVersion).toBe(2);
    expect(p.llmMode).toBe("mock");
    expect(p.agentStatus).toBe("success");
  });

  it("defaults model + maps failed status", () => {
    const p = normalizeAgentLogEntry(entry({ model: "", status: "failed", llm_mode: undefined }), 0);
    expect(p.model).toBe("mock-rules-v1");
    expect(p.agentStatus).toBe("failed");
    expect(p.llmMode).toBeNull();
  });
});

describe("O28 — buildTrailSummary", () => {
  it("computes agentCount + durationMs", () => {
    const events = [
      { stepOrder: 0, agentId: "pm", startedAt: "2026-06-01T10:00:00Z", endedAt: "2026-06-01T10:00:02Z" },
      { stepOrder: 1, agentId: "copy", startedAt: "2026-06-01T10:00:02Z", endedAt: "2026-06-01T10:00:10Z" },
    ] as AgentAuditEvent[];
    const s = buildTrailSummary(events);
    expect(s.agentCount).toBe(2);
    expect(s.firstAgent).toBe("pm");
    expect(s.lastAgent).toBe("copy");
    expect(s.durationMs).toBe(10000);
  });

  it("empty → zeros", () => {
    const s = buildTrailSummary([]);
    expect(s.agentCount).toBe(0);
    expect(s.durationMs).toBe(0);
  });
});

describe("O28 — computeEventHash", () => {
  it("deterministic for same inputs", () => {
    const a = computeEventHash("run-1", "sku", "pm", 0, "copy", 1);
    const b = computeEventHash("run-1", "sku", "pm", 0, "copy", 1);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
  it("differs on different inputs", () => {
    expect(computeEventHash("run-1", "sku", "pm", 0, "copy", 1)).not.toBe(computeEventHash("run-1", "sku", "pm", 1, "copy", 1));
  });
});

// ── recordFromSimulation ─────────────────────────────────────────────────────────

describe("O28 — recordFromSimulation", () => {
  it("inserts N rows for N agents", async () => {
    const { db, calls } = makeDb(() => []);
    const svc = new OsAgentAuditTrailService(db);
    const r = await svc.recordFromSimulation({
      packRunId: "run-1", sku: "NELVYON-LANDING", workspaceId: 7,
      agentLog: [entry({ agent: "pm" }), entry({ agent: "copy" }), entry({ agent: "design" })],
      qa: { score: 90, passed: true },
    });
    expect(r.inserted).toBe(3);
    expect(calls[0]!.sql).toContain("INSERT INTO os_agent_audit_events");
    // 3 rows × 18 params each
    expect(calls[0]!.params.length).toBe(54);
  });

  it("attaches qa_score/qa_passed to rows", async () => {
    const { db, calls } = makeDb(() => []);
    await new OsAgentAuditTrailService(db).recordFromSimulation({
      packRunId: "run-1", sku: "S", agentLog: [entry()], qa: { score: 77.6, passed: false },
    });
    // qa_score is param index 13 (0-based) within first row; rounded
    expect(calls[0]!.params).toContain(78);
    expect(calls[0]!.params).toContain(false);
  });

  it("empty agentLog → inserted 0, no query", async () => {
    const { db, calls } = makeDb(() => []);
    const r = await new OsAgentAuditTrailService(db).recordFromSimulation({ packRunId: "run-1", sku: "S", agentLog: [] });
    expect(r.inserted).toBe(0);
    expect(calls.length).toBe(0);
  });

  it("preserves step_order sequential 0..n-1", async () => {
    const { db, calls } = makeDb(() => []);
    await new OsAgentAuditTrailService(db).recordFromSimulation({
      packRunId: "run-1", sku: "S", agentLog: [entry(), entry(), entry()],
    });
    // step_order is the 2nd param of each 18-param row group
    expect(calls[0]!.params[1]).toBe(0);
    expect(calls[0]!.params[19]).toBe(1);
    expect(calls[0]!.params[37]).toBe(2);
  });
});

// ── getTrailForPackRun ───────────────────────────────────────────────────────────

describe("O28 — getTrailForPackRun", () => {
  it("groups events by sku", async () => {
    const { db } = makeDb(() => [
      eventRow({ id: "a", sku: "LANDING", step_order: 0, agent_id: "pm" }),
      eventRow({ id: "b", sku: "LANDING", step_order: 1, agent_id: "copy" }),
      eventRow({ id: "c", sku: "SEO", step_order: 0, agent_id: "seo" }),
    ]);
    const trails = await new OsAgentAuditTrailService(db).getTrailForPackRun("run-1");
    expect(trails).toHaveLength(2);
    const landing = trails.find((t) => t.sku === "LANDING")!;
    expect(landing.agentCount).toBe(2);
    expect(landing.qaScore).toBe(88);
  });
});

// ── listEvents ───────────────────────────────────────────────────────────────────

describe("O28 — listEvents", () => {
  it("filters by agentId", async () => {
    const { db, calls } = makeDb(() => [eventRow()]);
    await new OsAgentAuditTrailService(db).listEvents({ agentId: "copywriter" });
    expect(calls[0]!.sql).toContain("agent_id = $1");
    expect(calls[0]!.params).toContain("copywriter");
  });

  it("filters by packRunId", async () => {
    const { db, calls } = makeDb(() => [eventRow()]);
    await new OsAgentAuditTrailService(db).listEvents({ packRunId: "run-1" });
    expect(calls[0]!.sql).toContain("pack_run_id = $1::uuid");
  });

  it("preserves llm_mode + agent_status on map", async () => {
    const { db } = makeDb(() => [eventRow({ llm_mode: "real", agent_status: "failed" })]);
    const list = await new OsAgentAuditTrailService(db).listEvents({});
    expect(list[0]!.llmMode).toBe("real");
    expect(list[0]!.agentStatus).toBe("failed");
  });
});

// ── getSummary / hasTrail ────────────────────────────────────────────────────────

describe("O28 — getSummary + hasTrail", () => {
  it("getSummary counts + avg + topAgents", async () => {
    const { db } = makeDb((sql) => {
      if (sql.includes("COUNT(DISTINCT pack_run_id)")) return [{ total: "20", pack_runs: "4", agents: "6", skus: "8", last: "2026-06-01T00:00:00Z" }];
      if (sql.includes("GROUP BY agent_id")) return [{ agent_id: "copywriter", count: "8" }];
      return [];
    });
    const s = await new OsAgentAuditTrailService(db).getSummary();
    expect(s.totalEvents).toBe(20);
    expect(s.packRuns).toBe(4);
    expect(s.uniqueAgents).toBe(6);
    expect(s.avgStepsPerSku).toBe(2.5);
    expect(s.topAgents[0]!.agentId).toBe("copywriter");
  });

  it("hasTrail true/false", async () => {
    const dbTrue = makeDb(() => [{ exists: true }]).db;
    const dbFalse = makeDb(() => [{ exists: false }]).db;
    expect(await new OsAgentAuditTrailService(dbTrue).hasTrail("run-1")).toBe(true);
    expect(await new OsAgentAuditTrailService(dbFalse).hasTrail("run-2")).toBe(false);
  });

  it("hasTrail false on error", async () => {
    const db = makeDb(() => { throw new Error("no table"); }).db;
    expect(await new OsAgentAuditTrailService(db).hasTrail("run-1")).toBe(false);
  });
});
