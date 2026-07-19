/**
 * Workforce PASS residuals — evals, workflow audit, soak, OpenClaw mock, RAG isolation.
 * Deterministic / sandbox unless env opts into live (see workforceLive.test.ts).
 */

import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runAgentEvalSuite,
  WORKFORCE_WORKFLOWS,
  workflowCatalogStatus,
  listUnifiedAgents,
  getWorkforceWorkflow,
} from "../../agents";
import { sandboxJobExecutor } from "../../orchestrator/jobExecutor";
import {
  InMemoryAgentOrchestrator,
  OrchestratorDaemon,
  resetOrchestratorForTests,
} from "../../orchestrator";
import {
  startOpenClawMockServer,
  handleOpenClawMockDispatch,
  isOpenClawRuntimeAuthorized,
} from "../../openclaw";
import {
  HttpOpenClawBridge,
  resetOpenClawBridgeForTests,
} from "../../private-ai/adapters/OpenClawBridge";
import { resetOperationModeForTests } from "../../agents/workforce/operationModes";
import { indexAndEvaluateSyntheticCorpus, ragMetricsPass } from "../../private-ai/rag/syntheticCorpusIngest";

describe("Workforce residuals — Product/DevOps/Social evals", () => {
  it("passes dedicated suites including adversarial/security", async () => {
    const report = await runAgentEvalSuite();
    const needed = [
      "product_roadmap",
      "product_adversarial",
      "devops_runbook",
      "devops_security",
      "social_calendar",
      "social_adversarial",
    ];
    for (const id of needed) {
      const r = report.results.find((x) => x.caseId === id);
      expect(r, id).toBeTruthy();
      expect(r!.passed, `${id} score=${r?.score} ${JSON.stringify(r?.details)}`).toBe(true);
    }
    const security = report.results.filter((r) =>
      ["prompt_injection", "cross_tenant", "adversarial"].includes(r.kind),
    );
    expect(security.length).toBeGreaterThanOrEqual(5);
    expect(security.every((r) => r.passed)).toBe(true);
  });
});

describe("Workforce residuals — workflow catalog audit", () => {
  it("every certified workflow has runtime agents, schemas, rollback pattern or approval", async () => {
    const st = workflowCatalogStatus();
    expect(st.certified).toBe(WORKFORCE_WORKFLOWS.length);
    expect(st.total).toBeGreaterThanOrEqual(40);

    const byId = new Map(listUnifiedAgents().map((a) => [a.id, a]));
    const rollbackPatterns = new Set(["execute_validate_rollback", "detect_diagnose_remediate_verify"]);

    for (const w of WORKFORCE_WORKFLOWS) {
      expect(getWorkforceWorkflow(w.id)?.id).toBe(w.id);
      expect(Object.keys(w.inputSchema).length).toBeGreaterThan(0);
      expect(Object.keys(w.outputSchema).length).toBeGreaterThan(0);
      expect(w.agents.length).toBeGreaterThan(0);
      for (const agentId of w.agents) {
        const a = byId.get(agentId);
        expect(a?.runtimeReady, `${w.id} agent ${agentId}`).toBe(true);
      }
      const hasRollbackSemantics =
        rollbackPatterns.has(w.pattern) || w.requiresHumanApproval || w.defaultMode !== "autonomous";
      expect(hasRollbackSemantics, w.id).toBe(true);
    }
  });

  it("sandbox-executes primary agent for every workflow (permissions + deliverable)", async () => {
    const failures: string[] = [];
    for (const w of WORKFORCE_WORKFLOWS) {
      const agentId = w.agents[0]!;
      const input = `Workflow ${w.id}: ${w.title}. Validar permisos y next steps. Sin acciones irreversibles.`;
      const r = await sandboxJobExecutor({
        tenantId: "wf-audit",
        agentId,
        correlationId: `wf-${w.id}`,
        traceId: `tr-${w.id}`,
        input,
        pattern: w.pattern,
      });
      if (!r.ok || !r.validated) failures.push(`${w.id}:${agentId}:${r.error ?? "fail"}`);
    }
    expect(failures, failures.join("; ")).toEqual([]);
  });
});

describe("Workforce residuals — OpenClaw mock + live-ready", () => {
  afterEach(() => {
    resetOpenClawBridgeForTests();
    delete process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED;
    delete process.env.NELVYON_OPENCLAW_BRIDGE_URL;
    delete process.env.NELVYON_SHARED_MEMORY_ENABLED;
  });

  it("mock dispatch is certified without live URL", () => {
    const r = handleOpenClawMockDispatch({
      agentId: "seo",
      tenantId: "t1",
      input: "ping",
      tools: ["rag.search"],
    });
    expect(r.status).toBe(200);
    expect(r.payload.ok).toBe(true);
  });

  it("HTTP mock + bridge roundtrip (live activates only with URL)", async () => {
    const mock = await startOpenClawMockServer();
    try {
      process.env.NELVYON_SHARED_MEMORY_ENABLED = "1";
      process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED = "1";
      process.env.NELVYON_OPENCLAW_BRIDGE_URL = mock.url;
      expect(isOpenClawRuntimeAuthorized()).toBe(true);
      resetOpenClawBridgeForTests();
      const bridge = new HttpOpenClawBridge();
      expect(bridge.status()).toBe("available");
      const out = await bridge.dispatch({
        tenantId: "t1",
        agentId: "seo",
        correlationId: "oc-1",
        input: "audit",
        tools: ["rag.search"],
      });
      expect(out.ok).toBe(true);
    } finally {
      await mock.close();
    }
  });
});

describe("Workforce residuals — RAG isolation (synthetic)", () => {
  it("tenant isolation + grounding metrics pass", async () => {
    const { metrics } = await indexAndEvaluateSyntheticCorpus({ dim: 64 });
    const gate = ragMetricsPass(metrics);
    expect(metrics.tenantIsolationOk).toBe(true);
    expect(gate.ok, gate.reasons?.join("; ")).toBe(true);
  });
});

describe("Workforce residuals — reasonable soak", () => {
  afterEach(() => {
    resetOperationModeForTests();
    resetOrchestratorForTests();
    delete process.env.NELVYON_ORCHESTRATOR_DAEMON;
  });

  it(
    "daemon processes burst with retries, no leak of running jobs, metrics written",
    async () => {
      process.env.NELVYON_ORCHESTRATOR_DAEMON = "1";
      const dir = mkdtempSync(join(tmpdir(), "orch-soak-"));
      const soakMs = Number(process.env.NELVYON_WORKFORCE_SOAK_MS ?? 8_000);
      try {
        const orch = new InMemoryAgentOrchestrator(undefined, { persistDir: dir });
        const daemon = new OrchestratorDaemon(orch, { healthDir: dir, pollIntervalMs: 60_000 });
        daemon.start();

        const n = 24;
        const ids: string[] = [];
        for (let i = 0; i < n; i++) {
          ids.push(
            await orch.enqueue({
              tenantId: "soak",
              agentId: i % 3 === 0 ? "seo" : i % 3 === 1 ? "crm" : "support",
              correlationId: `soak-${i}`,
              traceId: `tr-soak-${i}`,
              priority: 50 + (i % 10),
              payload: {
                input:
                  i % 11 === 0
                    ? ""
                    : `Soak job ${i}: auditoría/seguimiento con next steps y validación.`,
              },
              maxAttempts: 2,
              scheduledAt: new Date().toISOString(),
              parentJobId: null,
            }),
          );
        }

        const t0 = Date.now();
        let ticks = 0;
        while (Date.now() - t0 < soakMs) {
          // Force due retries
          for (const id of ids) {
            const j = await orch.getJob("soak", id);
            if (j?.state === "queued" && typeof j.payload.nextRetryAt === "string") {
              j.payload = { ...j.payload, nextRetryAt: new Date(Date.now() - 1).toISOString() };
              orch.upsertJob(j);
            }
          }
          await daemon.tick();
          ticks += 1;
        }

        const jobs = ids.map((id) => orch.getJob("soak", id));
        const resolved = await Promise.all(jobs);
        const running = resolved.filter((j) => j?.state === "running").length;
        const succeeded = resolved.filter((j) => j?.state === "succeeded").length;
        const dead = resolved.filter((j) => j?.state === "dead_letter").length;
        const queued = resolved.filter((j) => j?.state === "queued").length;

        expect(running).toBe(0);
        expect(succeeded + dead).toBeGreaterThanOrEqual(n - 2);
        expect(daemon.health().jobsProcessed).toBeGreaterThan(0);

        const metrics = {
          soakMs,
          ticks,
          jobs: n,
          succeeded,
          dead_letter: dead,
          queued_remaining: queued,
          running_leaked: running,
          jobsProcessed: daemon.health().jobsProcessed,
          ok: running === 0 && succeeded + dead >= n - 2,
        };
        const outDir = join(process.cwd(), "../../backend/local-ai/benchmarks");
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, "workforce_soak.json"), JSON.stringify(metrics, null, 2), "utf8");
        expect(metrics.ok).toBe(true);

        await daemon.stop();
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
