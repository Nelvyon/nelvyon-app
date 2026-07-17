import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  InMemoryAgentOrchestrator,
  getAgentOrchestrator,
  isOrchestratorEnabled,
  resetOrchestratorForTests,
  setOrchestratorForTests,
  OrchestratorNotEnabledError,
} from "../../orchestrator";
import { agentRegistryStatus, listUnifiedAgents } from "../../agents";
import { getPromptRegistry, resetPromptRegistryForTests } from "../../prompt-registry";
import { isOpenClawRuntimeAuthorized } from "../../openclaw";

describe("Phase2 orchestrator runtime", () => {
  beforeEach(() => {
    process.env.NELVYON_ORCHESTRATOR_ENABLED = "1";
    resetOrchestratorForTests();
    setOrchestratorForTests(new InMemoryAgentOrchestrator());
  });

  afterEach(() => {
    delete process.env.NELVYON_ORCHESTRATOR_ENABLED;
    resetOrchestratorForTests();
  });

  it("enqueues and fetches jobs with tenant isolation", async () => {
    expect(isOrchestratorEnabled()).toBe(true);
    const orch = getAgentOrchestrator() as InMemoryAgentOrchestrator;
    const id = await orch.enqueue({
      tenantId: "t1",
      agentId: "ceo_supervisor",
      correlationId: "c1",
      traceId: "tr1",
      priority: 10,
      payload: { x: 1 },
      maxAttempts: 3,
      scheduledAt: new Date().toISOString(),
      parentJobId: null,
    });
    const job = await orch.getJob("t1", id);
    expect(job?.agentId).toBe("ceo_supervisor");
    expect(await orch.getJob("t2", id)).toBeNull();
  });

  it("coordinates specialist fanout", async () => {
    const orch = getAgentOrchestrator() as InMemoryAgentOrchestrator;
    const corr = await orch.coordinate(
      "t1",
      {
        pattern: "parallel_fanout",
        agents: ["seo", "copywriting"],
        timeoutMs: 1000,
        requireAllSuccess: false,
      },
      "plan campaña",
    );
    expect(corr).toBeTruthy();
    expect(orch.listJobs("t1").length).toBeGreaterThanOrEqual(2);
  });
});

describe("Phase2 agent registry + prompts", () => {
  afterEach(() => {
    resetPromptRegistryForTests();
  });

  it("unifies private AI + specialist designs", () => {
    const st = agentRegistryStatus();
    expect(st.total).toBeGreaterThanOrEqual(22);
    expect(st.runtimeReady).toBeGreaterThanOrEqual(10);
    expect(listUnifiedAgents().some((a) => a.id === "ceo_supervisor" && a.source === "both")).toBe(true);
  });

  it("versions prompts per agent", () => {
    resetPromptRegistryForTests();
    const reg = getPromptRegistry();
    expect(reg.listAll().length).toBeGreaterThanOrEqual(10);
    const v1 = reg.upsert({ agentId: "seo", name: "system", version: "1.0.0", body: "SEO v1" });
    const v2 = reg.upsert({ agentId: "seo", name: "system", version: "1.1.0", body: "SEO v2" });
    expect(v2.active).toBe(true);
    expect(reg.listByAgent("seo").find((p) => p.version === "1.0.0")?.active).toBe(false);
    expect(reg.getActive("seo", "system")?.body).toBe("SEO v2");
    expect(v1.version).toBe("1.0.0");
  });
});

describe("OpenClaw authorization gate", () => {
  afterEach(() => {
    delete process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED;
    delete process.env.NELVYON_SHARED_MEMORY_ENABLED;
  });

  it("stays false by default", () => {
    expect(isOpenClawRuntimeAuthorized()).toBe(false);
  });

  it("requires both OpenClaw flag and Shared Memory", () => {
    process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED = "1";
    expect(isOpenClawRuntimeAuthorized()).toBe(false);
    process.env.NELVYON_SHARED_MEMORY_ENABLED = "1";
    expect(isOpenClawRuntimeAuthorized()).toBe(true);
  });

  it("orchestrator disabled throws", async () => {
    delete process.env.NELVYON_ORCHESTRATOR_ENABLED;
    resetOrchestratorForTests();
    await expect(getAgentOrchestrator().enqueue()).rejects.toBeInstanceOf(OrchestratorNotEnabledError);
  });
});
