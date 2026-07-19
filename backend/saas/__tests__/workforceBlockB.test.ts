/**
 * Workforce Block B — hierarchy, aliases, ephemeral workers, operation modes.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  resolveCanonicalAgentId,
  isDeprecatedAgentId,
  getWorkforceProfile,
  effectiveRuntimeAgentId,
  listWorkforceByLevel,
  createEphemeralWorker,
  runEphemeralWorkerSandbox,
  resetEphemeralWorkersForTests,
  triggerEmergencyStop,
  clearEmergencyStop,
  assertActionAllowedInMode,
  getGlobalOperationMode,
  resetOperationModeForTests,
  agentRegistryStatus,
  listUnifiedAgents,
} from "../../agents";

describe("Workforce hierarchy + aliases", () => {
  it("resolves deprecated aliases to canonical IDs", () => {
    expect(resolveCanonicalAgentId("sem_google_ads")).toBe("google_ads");
    expect(resolveCanonicalAgentId("automation")).toBe("workflows");
    expect(resolveCanonicalAgentId("analytics")).toBe("reporting");
    expect(resolveCanonicalAgentId("security")).toBe("security_compliance");
    expect(isDeprecatedAgentId("sem_google_ads")).toBe(true);
    expect(isDeprecatedAgentId("seo")).toBe(false);
  });

  it("maps L1 executives with promoted runtime identities", () => {
    expect(listWorkforceByLevel("L1_executive").length).toBeGreaterThanOrEqual(8);
    expect(effectiveRuntimeAgentId("cto")).toBe("cto");
    expect(effectiveRuntimeAgentId("marketing")).toBe("marketing");
    expect(getWorkforceProfile("ceo_supervisor")?.lifecycle).toBe("evaluated");
    expect(getWorkforceProfile("cto")?.lifecycle).toBe("evaluated");
    expect(getWorkforceProfile("product")?.lifecycle).toBe("evaluated");
  });

  it("marks aliases deprecated in unified registry", () => {
    const st = agentRegistryStatus();
    expect(st.deprecated).toBe(4);
    expect(st.deprecatedIds).toContain("sem_google_ads");
    const alias = listUnifiedAgents().find((a) => a.id === "sem_google_ads");
    expect(alias?.deprecated).toBe(true);
    expect(alias?.runtimeReady).toBe(false);
    expect(alias?.canonicalId).toBe("google_ads");
  });
});

describe("Ephemeral workers", () => {
  afterEach(() => resetEphemeralWorkersForTests());

  it("creates, executes sandbox, and destroys without permanent memory", async () => {
    const w = createEphemeralWorker({
      goal: "summarize",
      objective: "Resumir hallazgos SEO de la landing /demos",
      tenantId: "t1",
      correlationId: "c1",
      parentAgentId: "seo",
    });
    expect(w.persistMemory).toBe(false);
    const r = await runEphemeralWorkerSandbox(w.workerId);
    expect(r.ok).toBe(true);
    expect(r.evidence.persistMemory).toBe(false);
    expect(r.output).toContain("## Goal: summarize");
  });
});

describe("Operation modes + kill switch", () => {
  afterEach(() => resetOperationModeForTests());

  it("emergency stop blocks mutations", () => {
    triggerEmergencyStop();
    expect(getGlobalOperationMode()).toBe("emergency_stop");
    expect(assertActionAllowedInMode("emergency_stop", "advise").allowed).toBe(false);
    clearEmergencyStop("draft");
    expect(getGlobalOperationMode()).toBe("draft");
  });

  it("autonomous hard-denies delete/deploy/mass send", () => {
    expect(assertActionAllowedInMode("autonomous", "delete_data").allowed).toBe(false);
    expect(assertActionAllowedInMode("observe", "send_mass_campaign").allowed).toBe(false);
  });
});

describe("Orchestrator persistence + kill switch (Block C)", () => {
  afterEach(() => {
    resetOperationModeForTests();
    delete process.env.NELVYON_ORCHESTRATOR_ENABLED;
  });

  it("recovers running jobs to queued from checkpoint", async () => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const {
      InMemoryAgentOrchestrator,
      checkpointJobs,
      loadPersistedJobs,
      recoverJobsAfterRestart,
    } = await import("../../orchestrator");

    const dir = mkdtempSync(join(tmpdir(), "orch-persist-"));
    try {
      const orch = new InMemoryAgentOrchestrator(undefined, { persistDir: dir });
      process.env.NELVYON_ORCHESTRATOR_ENABLED = "1";
      const id = await orch.enqueue({
        tenantId: "t1",
        agentId: "seo",
        correlationId: "c",
        traceId: "tr",
        priority: 1,
        payload: { input: "x" },
        maxAttempts: 3,
        scheduledAt: new Date().toISOString(),
        parentJobId: null,
      });
      const job = await orch.getJob("t1", id);
      expect(job?.state).toBe("running");
      // simulate crash mid-run
      const map = loadPersistedJobs(dir);
      expect(map.size).toBeGreaterThanOrEqual(1);
      const recovered = recoverJobsAfterRestart(map);
      expect(recovered).toBeGreaterThanOrEqual(1);
      checkpointJobs(dir, map.values());
      const orch2 = new InMemoryAgentOrchestrator(undefined, { persistDir: dir });
      const stats = orch2.getRecoveryStats();
      expect(stats.persistEnabled).toBe(true);
      const j2 = await orch2.getJob("t1", id);
      expect(j2?.state).toBe("queued");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("blocks coordinate during emergency stop", async () => {
    const { InMemoryAgentOrchestrator } = await import("../../orchestrator");
    process.env.NELVYON_ORCHESTRATOR_ENABLED = "1";
    triggerEmergencyStop();
    const orch = new InMemoryAgentOrchestrator();
    await expect(
      orch.coordinate(
        "t1",
        { pattern: "sequential", agents: ["seo"], timeoutMs: 1000, requireAllSuccess: true },
        "audit",
      ),
    ).rejects.toThrow(/emergency_stop/);
  });
});
