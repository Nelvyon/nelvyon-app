import { describe, expect, it } from "vitest";
import {
  buildAutomationsOpsArtifacts,
  buildReputationOpsArtifacts,
} from "../automationsReputationPackProduction";
import {
  validateAutomationsOpsIntake,
  validateReputationOpsIntake,
} from "../automationsReputationPacksRunners";
import { isOsPackFeatureEnabled } from "../osPackFlags";
import { AUTOMATIONS_OPS_PACK_ID, REPUTATION_OPS_PACK_ID } from "../types";
import { PACK_REGISTRY, resolvePackId } from "../packRegistry";
import { getPackOsBinding } from "@/lib/os-core/packOsBridge";

const VALID_BASE = {
  business_name: "Test Biz",
  city: "Madrid",
  value_proposition: "Best product ever",
  primary_cta: "Contactar",
  sector: "local",
};

describe("automations-ops-pack + reputation-ops-pack contracts", () => {
  it("validateAutomationsOpsIntake — valid / invalid", () => {
    expect(validateAutomationsOpsIntake(VALID_BASE)).not.toBeNull();
    expect(validateAutomationsOpsIntake({ ...VALID_BASE, business_name: "" })).toBeNull();
    expect(validateAutomationsOpsIntake(null)).toBeNull();
  });

  it("validateReputationOpsIntake — valid / invalid", () => {
    expect(validateReputationOpsIntake({ ...VALID_BASE, sector: "ecommerce" })).not.toBeNull();
    expect(validateReputationOpsIntake({ ...VALID_BASE, city: "" })).toBeNull();
    expect(validateReputationOpsIntake(42)).toBeNull();
  });

  it("buildAutomationsOpsArtifacts returns real workflow/trigger/CRM/QA deliverables with QA>=85", () => {
    const art = buildAutomationsOpsArtifacts(VALID_BASE, 88);
    expect(art.workflow_map.workflows.length).toBeGreaterThan(0);
    expect(art.trigger_playbook.triggers.length).toBeGreaterThan(0);
    expect(art.crm_automation_draft.pipeline_stages.length).toBeGreaterThan(0);
    expect(art.qa_ops_checklist.checks.length).toBeGreaterThan(0);
    for (const part of [art.workflow_map, art.trigger_playbook, art.crm_automation_draft, art.qa_ops_checklist]) {
      expect(part.qa_score).toBeGreaterThanOrEqual(85);
      expect(part.production).toBe(true);
    }
    expect(JSON.stringify(art)).not.toContain("mock://");
  });

  it("buildReputationOpsArtifacts returns real monitoring/templates/recovery/trust deliverables, mass DM forbidden", () => {
    const art = buildReputationOpsArtifacts(VALID_BASE, 90);
    expect(art.review_monitoring_playbook.sensitive_auto_reply).toBe(false);
    expect(art.response_templates.auto_send).toBe(false);
    expect(art.response_templates.requires_human_review).toBe(true);
    expect(art.reputation_recovery_plan.mass_dm_forbidden).toBe(true);
    expect(art.trust_signals_kit.items.length).toBeGreaterThan(0);
    for (const part of [
      art.review_monitoring_playbook,
      art.response_templates,
      art.reputation_recovery_plan,
      art.trust_signals_kit,
    ]) {
      expect(part.qa_score).toBeGreaterThanOrEqual(85);
      expect(part.production).toBe(true);
    }
    expect(JSON.stringify(art)).not.toContain("mock://");
  });

  it("both packs are registered in PACK_REGISTRY with OS bindings and default-OFF flags outside staging", () => {
    expect(resolvePackId(AUTOMATIONS_OPS_PACK_ID)).toBe(AUTOMATIONS_OPS_PACK_ID);
    expect(resolvePackId(REPUTATION_OPS_PACK_ID)).toBe(REPUTATION_OPS_PACK_ID);
    expect(PACK_REGISTRY[AUTOMATIONS_OPS_PACK_ID].skuSequence).toContain("NELVYON-CHATBOT");
    expect(PACK_REGISTRY[REPUTATION_OPS_PACK_ID].skuSequence).toContain("NELVYON-CHATBOT");
    expect(getPackOsBinding(AUTOMATIONS_OPS_PACK_ID)).toBeTruthy();
    expect(getPackOsBinding(REPUTATION_OPS_PACK_ID)).toBeTruthy();

    const prevA = process.env.NELVYON_AUTOMATIONS_OPS_PACK;
    const prevR = process.env.NELVYON_REPUTATION_OPS_PACK;
    process.env.NELVYON_AUTOMATIONS_OPS_PACK = "0";
    process.env.NELVYON_REPUTATION_OPS_PACK = "0";
    expect(isOsPackFeatureEnabled("NELVYON_AUTOMATIONS_OPS_PACK")).toBe(false);
    expect(isOsPackFeatureEnabled("NELVYON_REPUTATION_OPS_PACK")).toBe(false);
    if (prevA === undefined) delete process.env.NELVYON_AUTOMATIONS_OPS_PACK;
    else process.env.NELVYON_AUTOMATIONS_OPS_PACK = prevA;
    if (prevR === undefined) delete process.env.NELVYON_REPUTATION_OPS_PACK;
    else process.env.NELVYON_REPUTATION_OPS_PACK = prevR;
  });
});
