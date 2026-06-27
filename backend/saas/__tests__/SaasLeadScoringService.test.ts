import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../SaasWorkflowService", () => ({
  getSaasWorkflowService: () => ({
    dispatchActiveWorkflows: vi.fn().mockResolvedValue(undefined),
  }),
}));

import {
  SaasLeadScoringService,
  resetSaasLeadScoringServiceForTests,
  SaasLeadScoringError,
  type SaasLeadCategory,
} from "../SaasLeadScoringService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const TENANT = "tenant-ls-001";
const CONTACT_ID = "00000000-0000-0000-0000-000000000001";

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1", tenant_id: TENANT, name: "Has email",
    field: "contact.has_email", operator: "is_true", value: "",
    points: 10, category: "demographic", active: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeContactSnap(overrides: Record<string, unknown> = {}) {
  return {
    name: "Juan García", email: "juan@test.com", phone: "612345678",
    company_name: "Acme SL", notes: null, status: "qualified", pipeline_stage: "proposal", value: 5000,
    email_opens: 0, email_clicks: 0, activity_count: 0,
    ...overrides,
  };
}

function makeScore(overrides: Record<string, unknown> = {}) {
  return {
    id: "score-1", tenant_id: TENANT, contact_id: CONTACT_ID,
    score: 10, grade: "B", category: "warm",
    reasons: JSON.stringify(["Has email"]), rule_breakdown: JSON.stringify([{ ruleId: "rule-1", ruleName: "Has email", points: 10 }]),
    scored_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("SaasLeadScoringService", () => {
  let db: SaasPostgresPort;
  let svc: SaasLeadScoringService;

  beforeEach(() => {
    resetSaasLeadScoringServiceForTests();
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    svc = new SaasLeadScoringService(db);
  });

  // ── listRules ──────────────────────────────────────────────────────────────
  describe("listRules", () => {
    it("returns mapped rules from DB", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeRule()]);
      const rules = await svc.listRules(TENANT);
      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe("Has email");
      expect(rules[0].active).toBe(true);
      expect(rules[0].points).toBe(10);
    });

    it("returns empty array when no rules", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      const rules = await svc.listRules(TENANT);
      expect(rules).toHaveLength(0);
    });
  });

  // ── createRule ─────────────────────────────────────────────────────────────
  describe("createRule", () => {
    it("creates rule and returns it", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeRule({ name: "Test rule" })]);
      const rule = await svc.createRule(TENANT, { name: "Test rule", field: "contact.has_email", operator: "is_true", points: 5 });
      expect(rule.name).toBe("Test rule");
      expect(rule.points).toBe(10); // from mock
    });

    it("throws VALIDATION when name is empty", async () => {
      await expect(svc.createRule(TENANT, { name: "", field: "contact.has_email", operator: "is_true", points: 5 }))
        .rejects.toThrow(SaasLeadScoringError);
    });

    it("throws VALIDATION when points is missing", async () => {
      await expect(svc.createRule(TENANT, { name: "X", field: "contact.has_email", operator: "is_true", points: undefined as unknown as number }))
        .rejects.toThrow(SaasLeadScoringError);
    });
  });

  // ── updateRule ─────────────────────────────────────────────────────────────
  describe("updateRule", () => {
    it("returns updated rule", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeRule({ name: "Updated", active: false })]);
      const rule = await svc.updateRule(TENANT, "rule-1", { name: "Updated", active: false });
      expect(rule.name).toBe("Updated");
      expect(rule.active).toBe(false);
    });

    it("throws NOT_FOUND when DB returns empty", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      await expect(svc.updateRule(TENANT, "bad-id", { active: false }))
        .rejects.toThrow(SaasLeadScoringError);
    });
  });

  // ── deleteRule ─────────────────────────────────────────────────────────────
  describe("deleteRule", () => {
    it("resolves silently when rule found", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([{ id: "rule-1" }]);
      await expect(svc.deleteRule(TENANT, "rule-1")).resolves.toBeUndefined();
    });

    it("throws NOT_FOUND when row missing", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      await expect(svc.deleteRule(TENANT, "bad")).rejects.toThrow(SaasLeadScoringError);
    });
  });

  // ── scoreContact ───────────────────────────────────────────────────────────
  describe("scoreContact", () => {
    it("evaluates is_true rule and saves score", async () => {
      // listRules
      vi.mocked(db.query).mockResolvedValueOnce([makeRule()]);
      // contact snapshot
      vi.mocked(db.query).mockResolvedValueOnce([makeContactSnap()]);
      // upsert score
      vi.mocked(db.query).mockResolvedValueOnce([makeScore({ score: 10 })]);

      const score = await svc.scoreContact(TENANT, CONTACT_ID);
      expect(score.score).toBe(10);
      expect(score.ruleBreakdown).toHaveLength(1);
      expect(score.ruleBreakdown[0].ruleName).toBe("Has email");
    });

    it("applies greater_than rule correctly", async () => {
      const rule = makeRule({ field: "contact.email_opens", operator: "greater_than", value: "3", points: 20 });
      vi.mocked(db.query).mockResolvedValueOnce([rule]);
      vi.mocked(db.query).mockResolvedValueOnce([makeContactSnap({ email_opens: 5 })]);
      vi.mocked(db.query).mockResolvedValueOnce([makeScore({ score: 20 })]);
      const score = await svc.scoreContact(TENANT, CONTACT_ID);
      expect(score.ruleBreakdown[0].points).toBe(20);
    });

    it("does not apply greater_than rule when value is below threshold", async () => {
      const rule = makeRule({ field: "contact.email_opens", operator: "greater_than", value: "10", points: 20 });
      vi.mocked(db.query).mockResolvedValueOnce([rule]);
      vi.mocked(db.query).mockResolvedValueOnce([makeContactSnap({ email_opens: 2 })]);
      vi.mocked(db.query).mockResolvedValueOnce([makeScore({ score: 0, grade: "D", category: "cold", reasons: "[]", rule_breakdown: "[]" })]);
      const score = await svc.scoreContact(TENANT, CONTACT_ID);
      expect(score.ruleBreakdown).toHaveLength(0);
    });

    it("throws NOT_FOUND when contact missing", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([makeRule()]);
      vi.mocked(db.query).mockResolvedValueOnce([]); // no contact
      await expect(svc.scoreContact(TENANT, CONTACT_ID)).rejects.toThrow(SaasLeadScoringError);
    });

    it("computes grade D when score is 0 and max > 0", async () => {
      const rule = makeRule({ field: "contact.has_phone", operator: "is_true", points: 10 });
      vi.mocked(db.query).mockResolvedValueOnce([rule]);
      // contact has no phone
      vi.mocked(db.query).mockResolvedValueOnce([makeContactSnap({ phone: null })]);
      vi.mocked(db.query).mockResolvedValueOnce([makeScore({ score: 0, grade: "D", category: "cold", reasons: "[]", rule_breakdown: "[]" })]);
      const score = await svc.scoreContact(TENANT, CONTACT_ID);
      expect(score.grade).toBe("D");
      expect(score.category).toBe("cold");
    });

    it("computes grade A when score >= 75% of max", async () => {
      const rules = [
        makeRule({ id: "r1", points: 80 }),
        makeRule({ id: "r2", name: "Has phone", field: "contact.has_phone", points: 20 }),
      ];
      vi.mocked(db.query).mockResolvedValueOnce(rules);
      vi.mocked(db.query).mockResolvedValueOnce([makeContactSnap()]); // has email & phone
      vi.mocked(db.query).mockResolvedValueOnce([makeScore({ score: 100, grade: "A", category: "hot" })]);
      const score = await svc.scoreContact(TENANT, CONTACT_ID);
      expect(score.grade).toBe("A");
      expect(score.category).toBe("hot");
    });

    it("evaluates equals operator for status field", async () => {
      const rule = makeRule({ field: "contact.status", operator: "equals", value: "qualified", points: 15 });
      vi.mocked(db.query).mockResolvedValueOnce([rule]);
      vi.mocked(db.query).mockResolvedValueOnce([makeContactSnap({ status: "qualified" })]);
      vi.mocked(db.query).mockResolvedValueOnce([makeScore({ score: 15 })]);
      const score = await svc.scoreContact(TENANT, CONTACT_ID);
      expect(score.ruleBreakdown[0].points).toBe(15);
    });
  });

  // ── listScores ─────────────────────────────────────────────────────────────
  describe("listScores", () => {
    it("returns mapped scores", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([
        { ...makeScore(), contact_name: "Ana", contact_email: "ana@x.com", contact_company: "Corp" },
      ]);
      const scores = await svc.listScores(TENANT);
      expect(scores[0].contactName).toBe("Ana");
      expect(scores[0].contactCompany).toBe("Corp");
    });

    it("filters by category", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([]);
      const scores = await svc.listScores(TENANT, { category: "hot" });
      expect(scores).toHaveLength(0);
    });
  });

  // ── getMaxPossibleScore ────────────────────────────────────────────────────
  describe("getMaxPossibleScore", () => {
    it("returns sum of positive points", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([{ total: "150" }]);
      const max = await svc.getMaxPossibleScore(TENANT);
      expect(max).toBe(150);
    });

    it("returns 0 when no rules", async () => {
      vi.mocked(db.query).mockResolvedValueOnce([{ total: "0" }]);
      const max = await svc.getMaxPossibleScore(TENANT);
      expect(max).toBe(0);
    });
  });
});
