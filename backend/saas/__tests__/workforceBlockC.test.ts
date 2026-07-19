/**
 * Block C — daemon tick, lease, restart recovery, dead-letter, kill switch.
 */

import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InMemoryAgentOrchestrator,
  OrchestratorDaemon,
  resetOrchestratorForTests,
} from "../../orchestrator";
import {
  resetOperationModeForTests,
  triggerEmergencyStop,
  clearEmergencyStop,
} from "../../agents/workforce/operationModes";

describe("Workforce Block C — daemon + recovery", () => {
  afterEach(() => {
    delete process.env.NELVYON_ORCHESTRATOR_DAEMON;
    delete process.env.NELVYON_ORCH_DEFER;
    resetOperationModeForTests();
    resetOrchestratorForTests();
  });

  it("daemon processes deferred queued jobs with lease metadata", async () => {
    process.env.NELVYON_ORCHESTRATOR_DAEMON = "1";
    const dir = mkdtempSync(join(tmpdir(), "orch-c-"));
    try {
      const orch = new InMemoryAgentOrchestrator(undefined, { persistDir: dir });
      const id = await orch.enqueue({
        tenantId: "t1",
        agentId: "seo",
        correlationId: "c1",
        traceId: "tr1",
        priority: 80,
        payload: { input: "Auditoría SEO landing demos con keywords y next steps" },
        maxAttempts: 3,
        scheduledAt: new Date().toISOString(),
        parentJobId: null,
      });
      expect((await orch.getJob("t1", id))?.state).toBe("queued");

      const daemon = new OrchestratorDaemon(orch, { healthDir: dir, pollIntervalMs: 60_000 });
      daemon.start();
      const { processed } = await daemon.tick();
      expect(processed).toBeGreaterThanOrEqual(1);
      const job = await orch.getJob("t1", id);
      expect(job?.state).toBe("succeeded");
      expect(job?.payload.leaseOwner).toBeTruthy();
      expect(daemon.health().status).toBe("ok");
      await daemon.stop();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recovers after simulated crash without duplicating success", async () => {
    process.env.NELVYON_ORCHESTRATOR_DAEMON = "1";
    const dir = mkdtempSync(join(tmpdir(), "orch-c2-"));
    try {
      const orch1 = new InMemoryAgentOrchestrator(undefined, { persistDir: dir });
      const id = await orch1.enqueue({
        tenantId: "t1",
        agentId: "crm",
        correlationId: "c2",
        traceId: "tr2",
        priority: 50,
        payload: { input: "Seguimiento CRM lead frío con next steps" },
        maxAttempts: 3,
        scheduledAt: new Date().toISOString(),
        parentJobId: null,
      });
      // crash mid-run: mark running then new process recovers to queued
      const j = await orch1.getJob("t1", id);
      j!.state = "running";
      j!.startedAt = new Date().toISOString();
      orch1.upsertJob(j!);

      const orch2 = new InMemoryAgentOrchestrator(undefined, { persistDir: dir });
      expect(orch2.getRecoveryStats().recovered).toBeGreaterThanOrEqual(1);
      const recovered = await orch2.getJob("t1", id);
      expect(recovered?.state).toBe("queued");

      const daemon = new OrchestratorDaemon(orch2, { healthDir: dir });
      daemon.start();
      await daemon.tick();
      expect((await orch2.getJob("t1", id))?.state).toBe("succeeded");
      // second tick must not re-run succeeded
      const before = daemon.health().jobsProcessed;
      await daemon.tick();
      expect(daemon.health().jobsProcessed).toBe(before);
      await daemon.stop();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("dead-letters after max attempts on empty input", async () => {
    process.env.NELVYON_ORCHESTRATOR_DAEMON = "1";
    const orch = new InMemoryAgentOrchestrator();
    const id = await orch.enqueue({
      tenantId: "t1",
      agentId: "seo",
      correlationId: "c3",
      traceId: "tr3",
      priority: 10,
      payload: { input: "" },
      maxAttempts: 1,
      scheduledAt: new Date().toISOString(),
      parentJobId: null,
    });
    const daemon = new OrchestratorDaemon(orch);
    daemon.start();
    await daemon.tick();
    const job = await orch.getJob("t1", id);
    expect(job?.state).toBe("dead_letter");
    await daemon.stop();
  });

  it("retries with backoff then dead-letters when due", async () => {
    process.env.NELVYON_ORCHESTRATOR_DAEMON = "1";
    const orch = new InMemoryAgentOrchestrator();
    const id = await orch.enqueue({
      tenantId: "t1",
      agentId: "seo",
      correlationId: "c3b",
      traceId: "tr3b",
      priority: 10,
      payload: { input: "" },
      maxAttempts: 2,
      scheduledAt: new Date().toISOString(),
      parentJobId: null,
    });
    const daemon = new OrchestratorDaemon(orch);
    daemon.start();
    await daemon.tick();
    expect((await orch.getJob("t1", id))?.state).toBe("queued");
    const j = await orch.getJob("t1", id);
    // Force retry due (bypass wall-clock backoff in unit test)
    j!.payload = { ...j!.payload, nextRetryAt: new Date(Date.now() - 1).toISOString() };
    orch.upsertJob(j!);
    await daemon.tick();
    expect((await orch.getJob("t1", id))?.state).toBe("dead_letter");
    await daemon.stop();
  });

  it("daemon tick is no-op under emergency stop", async () => {
    process.env.NELVYON_ORCHESTRATOR_DAEMON = "1";
    const orch = new InMemoryAgentOrchestrator();
    await orch.enqueue({
      tenantId: "t1",
      agentId: "seo",
      correlationId: "c4",
      traceId: "tr4",
      priority: 10,
      payload: { input: "SEO audit" },
      maxAttempts: 3,
      scheduledAt: new Date().toISOString(),
      parentJobId: null,
    });
    triggerEmergencyStop();
    const daemon = new OrchestratorDaemon(orch);
    daemon.start();
    const r = await daemon.tick();
    expect(r.processed).toBe(0);
    expect(daemon.health().status).toBe("emergency_stop");
    clearEmergencyStop();
    await daemon.stop();
  });
});
