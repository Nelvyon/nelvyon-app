import { afterEach, describe, expect, it } from "vitest";
import {
  INCIDENT_RUNBOOK_PATH,
  assertOpsObservabilityCoreIntegrity,
  buildOpsHealthSnapshot,
  buildStructuredLog,
  generateCorrelationId,
  listSimulatedAlerts,
  opsMetrics,
  resetOpsObservabilityForTests,
  simulateAlert,
} from "../OpsObservabilityCore";

describe("OpsObservabilityCore", () => {
  afterEach(() => {
    resetOpsObservabilityForTests();
  });

  it("passes its own integrity assertion", () => {
    expect(assertOpsObservabilityCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("generates unique correlation ids across many calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateCorrelationId()));
    expect(ids.size).toBe(50);
  });

  it("propagates a provided correlation id and tenant id through structured logs", () => {
    const correlationId = generateCorrelationId("test");
    const log = buildStructuredLog("warn", "something happened", {
      correlationId,
      tenantId: "tenant-42",
      context: { foo: "bar" },
    });
    expect(log.correlationId).toBe(correlationId);
    expect(log.tenantId).toBe("tenant-42");
    expect(log.level).toBe("warn");
    expect(log.context).toEqual({ foo: "bar" });
    expect(typeof log.timestampMs).toBe("number");
  });

  it("generates a fresh correlation id when none is provided", () => {
    const log1 = buildStructuredLog("info", "a");
    const log2 = buildStructuredLog("info", "b");
    expect(log1.correlationId).not.toBe(log2.correlationId);
  });

  it("metrics counters accumulate and can be snapshotted", () => {
    opsMetrics.increment("requests_total");
    opsMetrics.increment("requests_total", 4);
    expect(opsMetrics.get("requests_total")).toBe(5);
    expect(opsMetrics.snapshot()).toEqual({ requests_total: 5 });
  });

  it("simulateAlert records the alert and increments a severity-scoped metric", () => {
    const alert = simulateAlert("P0", "database unreachable");
    expect(alert.severity).toBe("P0");
    expect(listSimulatedAlerts()).toHaveLength(1);
    expect(opsMetrics.get("alerts_p0")).toBe(1);

    simulateAlert("P0", "still unreachable");
    expect(opsMetrics.get("alerts_p0")).toBe(2);
    expect(listSimulatedAlerts()).toHaveLength(2);
  });

  it("builds a health snapshot including probes, metrics, and the incident runbook path", () => {
    simulateAlert("P2", "minor blip");
    const snapshot = buildOpsHealthSnapshot("https://staging.example.com");
    expect(snapshot.probes.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.metrics.alerts_p2).toBe(1);
    expect(snapshot.incidentRunbookPath).toBe(INCIDENT_RUNBOOK_PATH);
    expect(typeof snapshot.timestampMs).toBe("number");
  });

  it("resetOpsObservabilityForTests clears metrics and alerts", () => {
    simulateAlert("P3", "noise");
    opsMetrics.increment("x");
    resetOpsObservabilityForTests();
    expect(listSimulatedAlerts()).toHaveLength(0);
    expect(opsMetrics.snapshot()).toEqual({});
  });
});
