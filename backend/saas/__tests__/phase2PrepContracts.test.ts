import { describe, expect, it } from "vitest";
import {
  OPENCLAW_ADAPTER_CONTRACT,
  isOpenClawRuntimeAuthorized,
  OPENCLAW_BENCHMARK_PLAN,
} from "../../openclaw";
import {
  ORCHESTRATOR_CONTRACT_VERSION,
  UnimplementedOrchestrator,
  OrchestratorNotEnabledError,
  isOrchestratorEnabled,
} from "../../orchestrator";
import { assertAgentCatalogComplete, SPECIALIST_AGENT_DESIGNS } from "../../agents";
import { assertAiPanelDesign, AI_PANEL_NAV } from "../../ai-panel";
import { AUTOMATION_FLOW_DESIGNS, listAutomationFlowsIndependentOfMcp } from "../../automations";

describe("Phase2 prep contracts (no MCP/Router runtime)", () => {
  it("OpenClaw stays unauthorized", () => {
    expect(isOpenClawRuntimeAuthorized()).toBe(false);
    expect(OPENCLAW_ADAPTER_CONTRACT.isolation).toBe("off");
    expect(OPENCLAW_ADAPTER_CONTRACT.security.privateModeRequired).toBe(true);
    expect(OPENCLAW_BENCHMARK_PLAN.cases.length).toBeGreaterThanOrEqual(5);
  });

  it("Orchestrator stub throws NotEnabled", async () => {
    expect(isOrchestratorEnabled()).toBe(false);
    const o = new UnimplementedOrchestrator();
    expect(o.contractVersion).toBe(ORCHESTRATOR_CONTRACT_VERSION);
    await expect(o.enqueue()).rejects.toBeInstanceOf(OrchestratorNotEnabledError);
  });

  it("specialist catalog has 22+ complete agents", () => {
    const r = assertAgentCatalogComplete();
    expect(r.ok).toBe(true);
    expect(r.count).toBeGreaterThanOrEqual(22);
    expect(SPECIALIST_AGENT_DESIGNS.some((a) => a.id === "ceo_supervisor")).toBe(true);
    expect(SPECIALIST_AGENT_DESIGNS.some((a) => a.id === "finance")).toBe(true);
  });

  it("AI panel design covers nav + widgets", () => {
    const r = assertAiPanelDesign();
    expect(r.ok).toBe(true);
    expect(AI_PANEL_NAV.map((n) => n.id)).toContain("mcp");
    expect(AI_PANEL_NAV.map((n) => n.id)).toContain("memory");
  });

  it("automation flows include MCP-independent designs", () => {
    const indep = listAutomationFlowsIndependentOfMcp();
    expect(indep.length).toBeGreaterThanOrEqual(4);
    expect(AUTOMATION_FLOW_DESIGNS.some((f) => f.dependsOnMcp)).toBe(true);
  });
});
