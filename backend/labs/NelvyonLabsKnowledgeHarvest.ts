/**
 * NELVYON Labs — knowledge pattern harvest runtime.
 * Loads machine-generated pattern index (138 CONOCIMIENTO projects).
 * No vendor copy — patterns inform NELVYON architecture only.
 */

import patternsDoc from "./nelvyon-labs-knowledge-patterns.json";

export type HarvestPatternType =
  | "architecture"
  | "pipeline"
  | "data_model"
  | "security"
  | "observability"
  | "automation"
  | "ux_ui"
  | "performance"
  | "testing"
  | "integration"
  | "algorithm";

export type KnowledgePattern = {
  patternId: string;
  projectId: string;
  projectName: string;
  license: string;
  primaryCapability: string;
  patternType: HarvestPatternType;
  insight: string;
  nelvyonApplication: string[];
  repository: string;
};

export type KnowledgeHarvestIndex = {
  version: string;
  generatedAt: string;
  totalPatterns: number;
  patterns: KnowledgePattern[];
};

const index = patternsDoc as KnowledgeHarvestIndex;

export function getKnowledgeHarvestIndex(): KnowledgeHarvestIndex {
  return index;
}

export function getPatternByProjectId(projectId: string): KnowledgePattern | undefined {
  return index.patterns.find((p) => p.projectId === projectId);
}

export function getPatternsByCapability(capability: string): KnowledgePattern[] {
  return index.patterns.filter((p) => p.primaryCapability === capability);
}

export function getPatternsByType(type: HarvestPatternType): KnowledgePattern[] {
  return index.patterns.filter((p) => p.patternType === type);
}

export function assertKnowledgeHarvestComplete(expectedTotal = 138): {
  ok: boolean;
  total: number;
  violations: string[];
} {
  const violations: string[] = [];
  if (index.patterns.length !== expectedTotal) {
    violations.push(`pattern_count:${index.patterns.length}_expected_${expectedTotal}`);
  }
  const ids = new Set(index.patterns.map((p) => p.projectId));
  if (ids.size !== index.patterns.length) violations.push("duplicate_project_ids");
  for (const p of index.patterns) {
    if (!p.patternId) violations.push(`missing_pattern_id:${p.projectId}`);
    if (!p.insight) violations.push(`missing_insight:${p.projectId}`);
    if (!p.nelvyonApplication?.length) violations.push(`missing_application:${p.projectId}`);
  }
  return { ok: violations.length === 0, total: index.patterns.length, violations };
}
