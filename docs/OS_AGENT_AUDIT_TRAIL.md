# OS Agent Audit Trail (O28)

Verifiable, append-only trace of which agents ran for each SKU of a growth pack, what
artifact versions they consumed, what they produced, the model/tokens used, and the
SKU's final QA. No LLM and no agent re-execution — the service only **persists** the
`agent_log` already emitted by `runPipeline`.

## What it captures (per agent step)

From `AgentLogEntry` (backend/autonomous/types.ts): `agent`, `started_at`, `ended_at`,
`input_artifact_versions`, `output_artifact`, `output_version`, `model`, `tokens`,
`llm_mode`, `status`. The SKU's QA (`score`, `passed`) is duplicated onto every row of
that SKU for easy querying.

## When it records

`packOrchestrator.runSkuPipeline`, after `simulateAutonomousJob` (post O18 gate / O27
shield), calls `recordFromSimulation({ packRunId, sku, workspaceId, agentLog, qa,
metadata })`. One row per agent step. `agent_audit_count` is surfaced on the SKU result.
Best-effort: failures never block the pack run.

## Integrity (v1)

Append-only table `os_agent_audit_events`. `computeEventHash(packRunId, sku, agentId,
stepOrder, outputArtifact, outputVersion)` gives a deterministic SHA-256 per event for
tamper-evidence (helper exported; not yet stored as a column in v1).

## Relation to other modules

- **O23 delivery certificate** — lists SKUs/agents at a coarse grain; this trail is the
  step-level detail behind it. (A certificate → trail deep-link is deferred to keep the
  O23 issue path synchronous.)
- **O18 QA gate** — `os_qa_audit_runs` audits visual/legal per pack run; this trail adds
  the agent-by-agent breakdown and carries the SKU QA score.

## Difference vs `/os/agents/[id]/audit`

That page audits legacy OS **job runs** (`useAgentRun`). `/os/agent-audit` is the
**pack-level** trail for autonomous growth packs — a different data source.

## APIs

- `GET /api/os/agent-audit` → `{ summary, events[] }` (last 100; `?packRunId=&sku=&agentId=`)
- `GET /api/os/agent-audit/[packRunId]` → `{ packRunId, trails[] }` (timeline grouped by SKU)
- `POST /api/os/agent-audit/replay-check` → `{ packRunId, sku? }` → `{ ok, count }` | 404
