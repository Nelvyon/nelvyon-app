/**
 * Ops observability core — structured logging, correlation ids, in-memory
 * metrics counters, and a health snapshot. Wraps/complements
 * `backend/observability/NelvyonObservabilityAdapter.ts` (probe targets,
 * optional Uptime Kuma export). No paid Datadog/New Relic — everything here
 * is free, local, and in-memory (no new infra process).
 *
 * See `docs/ops/INCIDENT_RUNBOOK.md` for the human-facing incident procedure.
 */

import { getNelvyonProbeTargets, type ProbeTarget } from "../observability/NelvyonObservabilityAdapter";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type StructuredLogEntry = {
  level: LogLevel;
  message: string;
  correlationId: string;
  tenantId?: string;
  context?: Record<string, unknown>;
  timestampMs: number;
};

export const INCIDENT_RUNBOOK_PATH = "docs/ops/INCIDENT_RUNBOOK.md";

let correlationCounter = 0;

/** Monotonic-ish, collision-resistant correlation id — no external dependency (no uuid package required). */
export function generateCorrelationId(prefix = "nlv"): string {
  correlationCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${correlationCounter}-${rand}`;
}

export function buildStructuredLog(
  level: LogLevel,
  message: string,
  opts: { correlationId?: string; tenantId?: string; context?: Record<string, unknown> } = {},
): StructuredLogEntry {
  return {
    level,
    message,
    correlationId: opts.correlationId ?? generateCorrelationId(),
    tenantId: opts.tenantId,
    context: opts.context,
    timestampMs: Date.now(),
  };
}

// --- In-memory metrics counters ---

class MetricsRegistry {
  private counters = new Map<string, number>();

  increment(name: string, by = 1): number {
    const next = (this.counters.get(name) ?? 0) + by;
    this.counters.set(name, next);
    return next;
  }

  get(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }

  resetForTests(): void {
    this.counters.clear();
  }
}

export const opsMetrics = new MetricsRegistry();

// --- Health snapshot ---

export type OpsHealthSnapshot = {
  timestampMs: number;
  probes: ProbeTarget[];
  metrics: Record<string, number>;
  incidentRunbookPath: string;
};

export function buildOpsHealthSnapshot(baseUrl?: string): OpsHealthSnapshot {
  return {
    timestampMs: Date.now(),
    probes: getNelvyonProbeTargets(baseUrl),
    metrics: opsMetrics.snapshot(),
    incidentRunbookPath: INCIDENT_RUNBOOK_PATH,
  };
}

// --- Alert simulation (local only — no paid vendor call) ---

export type AlertSeverity = "P0" | "P1" | "P2" | "P3";

export type SimulatedAlert = {
  id: string;
  severity: AlertSeverity;
  message: string;
  correlationId: string;
  triggeredAtMs: number;
};

const alertLog: SimulatedAlert[] = [];

export function simulateAlert(severity: AlertSeverity, message: string, correlationId?: string): SimulatedAlert {
  const alert: SimulatedAlert = {
    id: `alert-${alertLog.length + 1}-${Date.now().toString(36)}`,
    severity,
    message,
    correlationId: correlationId ?? generateCorrelationId("alert"),
    triggeredAtMs: Date.now(),
  };
  alertLog.push(alert);
  opsMetrics.increment(`alerts_${severity.toLowerCase()}`);
  return alert;
}

export function listSimulatedAlerts(): SimulatedAlert[] {
  return [...alertLog];
}

export function resetOpsObservabilityForTests(): void {
  opsMetrics.resetForTests();
  alertLog.length = 0;
  correlationCounter = 0;
}

export function assertOpsObservabilityCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  resetOpsObservabilityForTests();

  const id1 = generateCorrelationId();
  const id2 = generateCorrelationId();
  if (id1 === id2) violations.push("correlation_ids_must_be_unique");

  const log = buildStructuredLog("info", "test", { correlationId: id1, tenantId: "tenant-1" });
  if (log.correlationId !== id1) violations.push("structured_log_must_propagate_correlation_id");
  if (log.tenantId !== "tenant-1") violations.push("structured_log_must_propagate_tenant_id");

  opsMetrics.increment("test_counter");
  opsMetrics.increment("test_counter");
  if (opsMetrics.get("test_counter") !== 2) violations.push("metrics_counter_must_accumulate");

  const alert = simulateAlert("P1", "test alert");
  if (!listSimulatedAlerts().some((a) => a.id === alert.id)) violations.push("alert_must_be_recorded");
  if (opsMetrics.get("alerts_p1") !== 1) violations.push("alert_must_increment_metric");

  const snapshot = buildOpsHealthSnapshot("https://example.com");
  if (snapshot.probes.length < 4) violations.push("health_snapshot_must_include_probes");
  if (snapshot.incidentRunbookPath !== INCIDENT_RUNBOOK_PATH) violations.push("health_snapshot_missing_runbook_path");

  resetOpsObservabilityForTests();
  return { ok: violations.length === 0, violations };
}
