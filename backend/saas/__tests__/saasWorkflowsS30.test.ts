/**
 * S30 — score_threshold trigger + new action types (enroll_sequence, create_task, update_field)
 * + workflow versions + CRUD with all trigger types.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../email/sesClient", () => ({
  getSesClient: () => ({ send: vi.fn().mockResolvedValue({}) }),
}));
vi.mock("@aws-sdk/client-ses", () => ({
  SendEmailCommand: vi.fn().mockImplementation((i: unknown) => i),
}));

import { SaasWorkflowService, resetSaasWorkflowServiceForTests } from "../SaasWorkflowService";
import type { SaasPostgresPort } from "../SaasOnboardingService";
import type { SaasCrmService } from "../SaasCrmService";
import type { SaasDealsService } from "../SaasDealsService";

const TENANT = "tenant-s30-001";

function makeWorkflowRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wf-1", tenant_id: TENANT, name: "Test", description: null,
    status: "active", trigger_type: "score_threshold",
    trigger_config: { min_score: 50 },
    conditions: [], actions: [{ type: "notify", config: { message: "Scored!" } }],
    run_count: 0, last_run_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1", workflow_id: "wf-1", tenant_id: TENANT,
    trigger_data: {}, status: "completed",
    steps_executed: [{ action: "notify", ok: true }],
    error: null, started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeSvc(db: SaasPostgresPort) {
  const crm = {
    updateContact: vi.fn().mockResolvedValue({}),
    addActivity: vi.fn().mockResolvedValue({}),
    getContact: vi.fn().mockResolvedValue(null),
  } as unknown as Pick<SaasCrmService, "updateContact" | "addActivity" | "getContact">;
  const deals = {
    changeStage: vi.fn().mockResolvedValue({}),
    updateDeal: vi.fn().mockResolvedValue({}),
    getDeal: vi.fn().mockResolvedValue(null),
  } as unknown as Pick<SaasDealsService, "changeStage" | "updateDeal" | "getDeal">;
  return new SaasWorkflowService(db, crm, deals);
}

describe("SaasWorkflowService — S30", () => {
  let db: SaasPostgresPort;
  let svc: SaasWorkflowService;

  beforeEach(() => {
    resetSaasWorkflowServiceForTests();
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    svc = makeSvc(db);
  });

  // ── matchesTriggerConfig: score_threshold ─────────────────────────────────
  describe("matchesTriggerConfig — score_threshold", () => {
    it("passes when score >= min_score", () => {
      expect(svc.matchesTriggerConfig("score_threshold", { min_score: 50 }, { score: { value: 75, grade: "A", category: "hot" } })).toBe(true);
    });

    it("fails when score < min_score", () => {
      expect(svc.matchesTriggerConfig("score_threshold", { min_score: 80 }, { score: { value: 40, grade: "D", category: "cold" } })).toBe(false);
    });

    it("passes when score equals min_score exactly", () => {
      expect(svc.matchesTriggerConfig("score_threshold", { min_score: 50 }, { score: { value: 50 } })).toBe(true);
    });

    it("filters by grade when specified", () => {
      expect(svc.matchesTriggerConfig("score_threshold", { min_score: 0, grade: "A" }, { score: { value: 100, grade: "B" } })).toBe(false);
    });

    it("passes when grade matches", () => {
      expect(svc.matchesTriggerConfig("score_threshold", { grade: "A" }, { score: { value: 100, grade: "A" } })).toBe(true);
    });

    it("filters by category when specified", () => {
      expect(svc.matchesTriggerConfig("score_threshold", { category: "hot" }, { score: { value: 80, category: "warm" } })).toBe(false);
    });

    it("passes with no config (open trigger)", () => {
      expect(svc.matchesTriggerConfig("score_threshold", {}, { score: { value: 0, grade: "D", category: "cold" } })).toBe(true);
    });
  });

  // ── CRUD with score_threshold trigger ─────────────────────────────────────
  describe("createWorkflow with score_threshold", () => {
    it("creates workflow and saves version", async () => {
      vi.mocked(db.query)
        // getTenantPlan (assertSaasPlanCanCreate call 1)
        .mockResolvedValueOnce([{ plan: "pro" }])
        // countResource (assertSaasPlanCanCreate call 2)
        .mockResolvedValueOnce([{ count: "0" }])
        // INSERT workflow
        .mockResolvedValueOnce([makeWorkflowRow()])
        // saveVersion
        .mockResolvedValueOnce([]);

      const wf = await svc.createWorkflow(TENANT, {
        name: "Score Threshold WF",
        triggerType: "score_threshold",
        triggerConfig: { min_score: 50 },
        actions: [{ type: "notify", config: { message: "Hot lead!" } }],
      });
      expect(wf.triggerType).toBe("score_threshold");
      expect(wf.triggerConfig).toEqual({ min_score: 50 });
    });

    it("rejects unknown trigger type", async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce([{ plan: "pro" }])
        .mockResolvedValueOnce([{ count: "0" }]);
      await expect(svc.createWorkflow(TENANT, {
        name: "X",
        triggerType: "unknown_trigger" as never,
        actions: [],
      })).rejects.toThrow();
    });
  });

  // ── review_received min_rating ────────────────────────────────────────────
  describe("matchesTriggerConfig — review_received", () => {
    it("passes when rating >= min_rating", () => {
      expect(svc.matchesTriggerConfig("review_received", { min_rating: 4 }, { rating: 5 })).toBe(true);
    });

    it("fails when rating < min_rating", () => {
      expect(svc.matchesTriggerConfig("review_received", { min_rating: 4 }, { rating: 3 })).toBe(false);
    });
  });

  // ── sequence_enrolled sequence_id filter ─────────────────────────────────
  describe("matchesTriggerConfig — sequence_enrolled", () => {
    it("matches specific sequence_id", () => {
      expect(svc.matchesTriggerConfig("sequence_enrolled", { sequence_id: "seq-abc" }, { sequenceId: "seq-abc" })).toBe(true);
    });
    it("rejects different sequence_id", () => {
      expect(svc.matchesTriggerConfig("sequence_enrolled", { sequence_id: "seq-abc" }, { sequenceId: "seq-xyz" })).toBe(false);
    });
    it("passes without config filter", () => {
      expect(svc.matchesTriggerConfig("sequence_enrolled", {}, { sequenceId: "any" })).toBe(true);
    });
  });

  // ── executeWorkflow: create_task action ───────────────────────────────────
  describe("executeWorkflow — create_task", () => {
    it("logs task to activity_log", async () => {
      const wf = makeWorkflowRow({
        actions: [{ type: "create_task", config: { title: "Follow up", description: "Call ASAP", dueInDays: 2 } }],
        conditions: [],
      });
      vi.mocked(db.query)
        // getWorkflow
        .mockResolvedValueOnce([wf])
        // INSERT run
        .mockResolvedValueOnce([{ id: "run-1", workflow_id: "wf-1", tenant_id: TENANT, trigger_data: {}, status: "running", steps_executed: [], error: null, started_at: new Date().toISOString(), completed_at: null }])
        // INSERT activity_log
        .mockResolvedValueOnce([])
        // UPDATE run completed
        .mockResolvedValueOnce([])
        // UPDATE workflow run_count
        .mockResolvedValueOnce([])
        // getWorkflowRuns
        .mockResolvedValueOnce([makeRunRow({ steps_executed: [{ action: "create_task", ok: true }] })]);

      const run = await svc.executeWorkflow("wf-1", TENANT, { contact: { id: "c-1" } });
      expect(run.status).toBe("completed");
    });
  });

  // ── executeWorkflow: update_field action ──────────────────────────────────
  describe("executeWorkflow — update_field", () => {
    it("updates allowed contact field", async () => {
      const wf = makeWorkflowRow({
        actions: [{ type: "update_field", config: { contactId: "c-1", field: "status", value: "qualified" } }],
        conditions: [],
      });
      vi.mocked(db.query)
        .mockResolvedValueOnce([wf])
        .mockResolvedValueOnce([{ id: "run-1", workflow_id: "wf-1", tenant_id: TENANT, trigger_data: {}, status: "running", steps_executed: [], error: null, started_at: new Date().toISOString(), completed_at: null }])
        // UPDATE saas_contacts
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeRunRow({ steps_executed: [{ action: "update_field", ok: true }] })]);

      const run = await svc.executeWorkflow("wf-1", TENANT, {});
      expect(run.status).toBe("completed");
    });

    it("marks step failed for disallowed field", async () => {
      const wf = makeWorkflowRow({
        actions: [{ type: "update_field", config: { contactId: "c-1", field: "id", value: "hacked" } }],
        conditions: [],
      });
      vi.mocked(db.query)
        .mockResolvedValueOnce([wf])
        .mockResolvedValueOnce([{ id: "run-1", workflow_id: "wf-1", tenant_id: TENANT, trigger_data: {}, status: "running", steps_executed: [], error: null, started_at: new Date().toISOString(), completed_at: null }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeRunRow({ steps_executed: [{ action: "update_field", ok: false }] })]);

      const run = await svc.executeWorkflow("wf-1", TENANT, {});
      expect(run.stepsExecuted[0]?.ok).toBe(false);
    });
  });

  // ── executeWorkflow: notify action smoke ─────────────────────────────────
  describe("executeWorkflow — notify smoke", () => {
    it("runs notify action and completes", async () => {
      const wf = makeWorkflowRow({ actions: [{ type: "notify", config: { message: "Hello" } }], conditions: [] });
      vi.mocked(db.query)
        .mockResolvedValueOnce([wf])
        .mockResolvedValueOnce([{ id: "run-1", workflow_id: "wf-1", tenant_id: TENANT, trigger_data: {}, status: "running", steps_executed: [], error: null, started_at: new Date().toISOString(), completed_at: null }])
        // INSERT activity_log (notify)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeRunRow()]);
      const run = await svc.executeWorkflow("wf-1", TENANT, {});
      expect(run.status).toBe("completed");
    });
  });

  // ── getVersions ───────────────────────────────────────────────────────────
  describe("getVersions", () => {
    it("returns mapped version list", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([
        { id: "v-1", version_num: 2, created_at: new Date().toISOString() },
        { id: "v-2", version_num: 1, created_at: new Date().toISOString() },
      ]);
      const versions = await svc.getVersions(TENANT, "wf-1");
      expect(versions).toHaveLength(2);
      expect(versions[0].versionNum).toBe(2);
    });

    it("returns empty array when no versions", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      expect(await svc.getVersions(TENANT, "wf-1")).toHaveLength(0);
    });
  });

  // ── saveVersion ───────────────────────────────────────────────────────────
  describe("saveVersion", () => {
    it("inserts without throwing", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      const wf = makeWorkflowRow();
      await expect(svc.saveVersion(TENANT, "wf-1", wf as never)).resolves.toBeUndefined();
    });
  });

  // ── dispatchActiveWorkflows: score_threshold ──────────────────────────────
  describe("dispatchActiveWorkflows — score_threshold", () => {
    it("fires workflow when score passes filter", async () => {
      const wf = makeWorkflowRow({ status: "active", trigger_type: "score_threshold", trigger_config: { min_score: 50 } });
      vi.mocked(db.query)
        // getWorkflows
        .mockResolvedValueOnce([wf])
        // executeWorkflow: getWorkflow
        .mockResolvedValueOnce([wf])
        // INSERT run
        .mockResolvedValueOnce([{ id: "run-1", workflow_id: "wf-1", tenant_id: TENANT, trigger_data: {}, status: "running", steps_executed: [], error: null, started_at: new Date().toISOString(), completed_at: null }])
        // notify → INSERT activity_log
        .mockResolvedValueOnce([])
        // UPDATE run
        .mockResolvedValueOnce([])
        // UPDATE wf run_count
        .mockResolvedValueOnce([])
        // getWorkflowRuns
        .mockResolvedValueOnce([makeRunRow()]);

      await expect(
        svc.dispatchActiveWorkflows(TENANT, "score_threshold", { score: { value: 75, grade: "A", category: "hot" } })
      ).resolves.toBeUndefined();
      expect(vi.mocked(db.query)).toHaveBeenCalled();
    });

    it("skips workflow when score below min_score", async () => {
      const wf = makeWorkflowRow({ status: "active", trigger_type: "score_threshold", trigger_config: { min_score: 80 } });
      vi.mocked(db.query).mockResolvedValueOnce([wf]);
      await svc.dispatchActiveWorkflows(TENANT, "score_threshold", { score: { value: 30 } });
      // only getWorkflows was called (1 call), executeWorkflow was NOT called
      expect(vi.mocked(db.query)).toHaveBeenCalledTimes(1);
    });
  });
});
