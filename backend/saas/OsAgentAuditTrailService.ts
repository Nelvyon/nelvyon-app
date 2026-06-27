/**
 * O28 — OsAgentAuditTrailService
 * Persists the agent_log already emitted by runPipeline (pm→strategist→copy→design→
 * build→seo…) per pack run + SKU, with the SKU's final QA, as an append-only,
 * verifiable trail. No LLM / no agent re-execution — only persistence + queries.
 *
 * Standalone + injectable db port so vitest never hits a live DB; prod lazy.
 */
import { createHash } from "crypto";
import type { SaasPostgresPort } from "./SaasOnboardingService";

// Mirror of backend/autonomous/types.ts AgentLogEntry (kept local to avoid a
// cross-package import in the standalone service surface).
export type AgentLogEntry = {
  agent: string;
  started_at: string;
  ended_at: string;
  input_artifact_versions: Record<string, number>;
  output_artifact: string;
  output_version: number;
  model: string;
  tokens: number;
  llm_mode?: "mock" | "real";
  status: "success" | "failed";
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type AgentAuditEvent = {
  id: string;
  packRunId: string;
  sku: string;
  agentId: string;
  stepOrder: number;
  inputArtifactVersions: Record<string, number>;
  outputArtifact: string;
  outputVersion: number;
  model: string;
  tokens: number;
  llmMode: "mock" | "real" | null;
  agentStatus: "success" | "failed";
  qaScore: number | null;
  qaPassed: boolean | null;
  startedAt: string | null;
  endedAt: string | null;
  metadata: Record<string, unknown>;
  recordedAt: string;
};

export type AgentAuditTrail = {
  packRunId: string;
  sku: string;
  events: AgentAuditEvent[];
  qaScore: number | null;
  qaPassed: boolean | null;
  agentCount: number;
};

export type AgentAuditSummary = {
  totalEvents: number;
  packRuns: number;
  uniqueAgents: number;
  avgStepsPerSku: number;
  lastRecordedAt: string | null;
  topAgents: Array<{ agentId: string; count: number }>;
};

// ── Pure helpers (exported for tests) ────────────────────────────────────────────

export type AgentInsertPayload = {
  agentId: string;
  stepOrder: number;
  inputArtifactVersions: Record<string, number>;
  outputArtifact: string;
  outputVersion: number;
  model: string;
  tokens: number;
  llmMode: "mock" | "real" | null;
  agentStatus: "success" | "failed";
  startedAt: string | null;
  endedAt: string | null;
};

export function normalizeAgentLogEntry(entry: AgentLogEntry, stepOrder: number): AgentInsertPayload {
  return {
    agentId: entry.agent,
    stepOrder,
    inputArtifactVersions: entry.input_artifact_versions ?? {},
    outputArtifact: entry.output_artifact,
    outputVersion: entry.output_version ?? 1,
    model: entry.model || "mock-rules-v1",
    tokens: entry.tokens ?? 0,
    llmMode: entry.llm_mode ?? null,
    agentStatus: entry.status === "failed" ? "failed" : "success",
    startedAt: entry.started_at ?? null,
    endedAt: entry.ended_at ?? null,
  };
}

export function buildTrailSummary(events: AgentAuditEvent[]): { agentCount: number; firstAgent: string | null; lastAgent: string | null; durationMs: number } {
  if (events.length === 0) return { agentCount: 0, firstAgent: null, lastAgent: null, durationMs: 0 };
  const ordered = [...events].sort((a, b) => a.stepOrder - b.stepOrder);
  const starts = ordered.map((e) => (e.startedAt ? Date.parse(e.startedAt) : NaN)).filter((x) => !Number.isNaN(x));
  const ends = ordered.map((e) => (e.endedAt ? Date.parse(e.endedAt) : NaN)).filter((x) => !Number.isNaN(x));
  const durationMs = starts.length && ends.length ? Math.max(0, Math.max(...ends) - Math.min(...starts)) : 0;
  return {
    agentCount: ordered.length,
    firstAgent: ordered[0]!.agentId,
    lastAgent: ordered[ordered.length - 1]!.agentId,
    durationMs,
  };
}

export function computeEventHash(
  packRunId: string, sku: string, agentId: string, stepOrder: number, outputArtifact: string, outputVersion: number,
): string {
  return createHash("sha256")
    .update(`${packRunId}|${sku}|${agentId}|${stepOrder}|${outputArtifact}|${outputVersion}`)
    .digest("hex");
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type EventRow = {
  id: string; pack_run_id: string; sku: string; agent_id: string; step_order: number;
  input_artifact_versions: Record<string, number>; output_artifact: string; output_version: number;
  model: string; tokens: number; llm_mode: "mock" | "real" | null; agent_status: "success" | "failed";
  qa_score: number | null; qa_passed: boolean | null; started_at: string | null; ended_at: string | null;
  metadata: Record<string, unknown>; recorded_at: string;
};

function rowToEvent(r: EventRow): AgentAuditEvent {
  return {
    id: r.id, packRunId: r.pack_run_id, sku: r.sku, agentId: r.agent_id, stepOrder: r.step_order,
    inputArtifactVersions: r.input_artifact_versions ?? {}, outputArtifact: r.output_artifact,
    outputVersion: r.output_version, model: r.model, tokens: r.tokens, llmMode: r.llm_mode,
    agentStatus: r.agent_status, qaScore: r.qa_score, qaPassed: r.qa_passed,
    startedAt: r.started_at, endedAt: r.ended_at, metadata: r.metadata ?? {}, recordedAt: r.recorded_at,
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsAgentAuditTrailService | null = null;

export function getOsAgentAuditTrailService(): OsAgentAuditTrailService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsAgentAuditTrailService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsAgentAuditTrailServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsAgentAuditTrailService {
  constructor(private readonly db: SaasPostgresPort) {}

  /** Persist the SKU's agent_log as one row per agent step (append-only). */
  async recordFromSimulation(input: {
    packRunId: string;
    sku: string;
    workspaceId?: number;
    tenantId?: string;
    agentLog: AgentLogEntry[];
    qa?: { score: number; passed: boolean } | null;
    metadata?: Record<string, unknown>;
  }): Promise<{ inserted: number }> {
    const log = input.agentLog ?? [];
    if (log.length === 0) return { inserted: 0 };

    const qaScore = input.qa ? Math.round(input.qa.score) : null;
    const qaPassed = input.qa ? input.qa.passed : null;
    const metaJson = JSON.stringify(input.metadata ?? {});

    const values: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    log.forEach((entry, idx) => {
      const p = normalizeAgentLogEntry(entry, idx);
      values.push(
        `($${i++},$${i++},$${i++}::uuid,$${i++},$${i++},$${i++},$${i++}::jsonb,$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++}::jsonb)`,
      );
      params.push(
        input.packRunId, p.stepOrder, input.tenantId ?? null, input.workspaceId ?? null, input.sku, p.agentId,
        JSON.stringify(p.inputArtifactVersions), p.outputArtifact, p.outputVersion, p.model, p.tokens, p.llmMode,
        p.agentStatus, qaScore, qaPassed, p.startedAt, p.endedAt, metaJson,
      );
    });

    await this.db.query(
      `INSERT INTO os_agent_audit_events
         (pack_run_id, step_order, tenant_id, workspace_id, sku, agent_id,
          input_artifact_versions, output_artifact, output_version, model, tokens, llm_mode,
          agent_status, qa_score, qa_passed, started_at, ended_at, metadata)
       VALUES ${values.join(", ")}`,
      params,
    );
    return { inserted: log.length };
  }

  async getTrailForPackRun(packRunId: string): Promise<AgentAuditTrail[]> {
    const rows = await this.db.query<EventRow>(
      `SELECT * FROM os_agent_audit_events WHERE pack_run_id = $1::uuid ORDER BY sku ASC, step_order ASC`,
      [packRunId],
    );
    const bySku = new Map<string, AgentAuditEvent[]>();
    for (const r of rows) {
      const ev = rowToEvent(r);
      const list = bySku.get(ev.sku) ?? [];
      list.push(ev);
      bySku.set(ev.sku, list);
    }
    return [...bySku.entries()].map(([sku, events]) => ({
      packRunId,
      sku,
      events,
      qaScore: events[0]?.qaScore ?? null,
      qaPassed: events[0]?.qaPassed ?? null,
      agentCount: events.length,
    }));
  }

  async listEvents(filters: { packRunId?: string; sku?: string; agentId?: string; limit?: number } = {}): Promise<AgentAuditEvent[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.packRunId) { conditions.push(`pack_run_id = $${idx++}::uuid`); params.push(filters.packRunId); }
    if (filters.sku) { conditions.push(`sku = $${idx++}`); params.push(filters.sku); }
    if (filters.agentId) { conditions.push(`agent_id = $${idx++}`); params.push(filters.agentId); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await this.db.query<EventRow>(
      `SELECT * FROM os_agent_audit_events ${where} ORDER BY recorded_at DESC LIMIT $${idx}`,
      [...params, Math.min(Math.max(filters.limit ?? 100, 1), 500)],
    );
    return rows.map(rowToEvent);
  }

  async getSummary(): Promise<AgentAuditSummary> {
    const rows = await this.db.query<{ total: string; pack_runs: string; agents: string; skus: string; last: string | null }>(
      `SELECT COUNT(*) AS total, COUNT(DISTINCT pack_run_id) AS pack_runs,
              COUNT(DISTINCT agent_id) AS agents, COUNT(DISTINCT (pack_run_id::text || '|' || sku)) AS skus,
              MAX(recorded_at) AS last
       FROM os_agent_audit_events`,
    );
    const r = rows[0];
    const total = parseInt(r?.total ?? "0", 10);
    const skus = parseInt(r?.skus ?? "0", 10);
    let topAgents: Array<{ agentId: string; count: number }> = [];
    try {
      const t = await this.db.query<{ agent_id: string; count: string }>(
        `SELECT agent_id, COUNT(*) AS count FROM os_agent_audit_events GROUP BY agent_id ORDER BY count DESC LIMIT 5`,
      );
      topAgents = t.map((x) => ({ agentId: x.agent_id, count: parseInt(x.count, 10) }));
    } catch { /* ignore */ }
    return {
      totalEvents: total,
      packRuns: parseInt(r?.pack_runs ?? "0", 10),
      uniqueAgents: parseInt(r?.agents ?? "0", 10),
      avgStepsPerSku: skus > 0 ? Math.round((total / skus) * 100) / 100 : 0,
      lastRecordedAt: r?.last ?? null,
      topAgents,
    };
  }

  async hasTrail(packRunId: string): Promise<boolean> {
    try {
      const rows = await this.db.query<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM os_agent_audit_events WHERE pack_run_id = $1::uuid) AS exists`,
        [packRunId],
      );
      return !!rows[0]?.exists;
    } catch {
      return false;
    }
  }
}
