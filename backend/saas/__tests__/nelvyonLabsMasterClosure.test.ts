import { describe, expect, it } from "vitest";
import { assertCapabilityRegistryComplete, getCapabilityDomains } from "../../labs/NelvyonLabsCapabilityRegistry";
import {
  assertKnowledgeHarvestComplete,
  getKnowledgeHarvestIndex,
  getPatternByProjectId,
} from "../../labs/NelvyonLabsKnowledgeHarvest";
import {
  MASTER_CLOSURE_DECLARATION,
  assertMasterClosure,
} from "../../labs/NelvyonLabsMasterClosure";

describe("NelvyonLabsMasterClosure", () => {
  it("certifies 461/461 definitive decisions", () => {
    const report = assertMasterClosure();
    expect(report.totalProjects).toBe(461);
    expect(report.pending).toBe(0);
    expect(report.ok).toBe(true);
    expect(report.violations).toEqual([]);
    expect(report.openClawBlocked).toBe(true);
  });

  it("harvests 138 knowledge patterns with nelvyon applications", () => {
    const harvest = assertKnowledgeHarvestComplete(138);
    expect(harvest.ok).toBe(true);
    const idx = getKnowledgeHarvestIndex();
    expect(idx.totalPatterns).toBe(138);
    const openWebui = getPatternByProjectId("open-webui");
    expect(openWebui?.patternId).toBe("harvest-open-webui");
    expect(openWebui?.nelvyonApplication.length).toBeGreaterThan(0);
  });

  it("covers 24+ enterprise capability domains", () => {
    const reg = assertCapabilityRegistryComplete();
    expect(reg.ok).toBe(true);
    expect(getCapabilityDomains().length).toBeGreaterThanOrEqual(24);
    const router = getCapabilityDomains().find((d) => d.id === "router");
    expect(router?.status).toBe("integrado_ganador");
  });

  it("declares master closure string", () => {
    expect(MASTER_CLOSURE_DECLARATION).toContain("461/461");
  });
});
