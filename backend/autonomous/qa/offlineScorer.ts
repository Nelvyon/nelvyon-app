/**
 * Phase C offline QA — structure, completeness, consistency, copy, SEO, brief compliance
 * Merges with rubric scorer (AUTONOMOUS_QA_RUBRICS.md)
 */

import type { AutonomousSku, QaCheckResult, QaResult } from "../types";
import {
  scoreCopyQuality,
  scoreSeoBasic,
  validateArtifactStructure,
  validateBrief,
  validateConsistency,
} from "./artifactValidators";
import { scoreProject } from "./scorer";

const THRESHOLD = 85;

export interface OfflineDimensions {
  structure: number;
  completeness: number;
  consistency: number;
  copy_quality: number;
  seo_basic: number;
  brief_compliance: number;
}

function briefComplianceScore(sku: AutonomousSku, brief: Record<string, unknown>): { points: number; checks: QaCheckResult[] } {
  const issues = validateBrief(sku, brief);
  const max = 15;
  const penalty = issues.filter((i) => i.blocking).length * 5;
  const points = Math.max(0, max - penalty);
  return {
    points,
    checks: issues.map((i) => ({
      id: i.code,
      passed: !i.blocking,
      points: i.blocking ? 0 : 3,
      max_points: 3,
      blocking: i.blocking,
      message: i.message,
    })),
  };
}

function structureScore(sku: AutonomousSku, artifacts: Record<string, unknown>): { points: number; checks: QaCheckResult[] } {
  const issues = validateArtifactStructure(sku, artifacts);
  const max = 15;
  const blocking = issues.filter((i) => i.blocking);
  const points = blocking.length === 0 ? max : Math.max(0, max - blocking.length * 5);
  return {
    points,
    checks: issues.map((i) => ({
      id: i.code,
      passed: !i.blocking,
      points: i.blocking ? 0 : 3,
      max_points: 3,
      blocking: i.blocking,
      message: i.message,
    })),
  };
}

function completenessScore(sku: AutonomousSku, brief: Record<string, unknown>, artifacts: Record<string, unknown>): { points: number; checks: QaCheckResult[] } {
  const rubric = scoreProject(sku, brief, artifacts, 1);
  const rubricPoints = Math.round(rubric.score * 0.2);
  const max = 20;
  return {
    points: Math.min(rubricPoints, max),
    checks: rubric.checks.slice(0, 8),
  };
}

function consistencyScore(sku: AutonomousSku, brief: Record<string, unknown>, artifacts: Record<string, unknown>): { points: number; checks: QaCheckResult[] } {
  const issues = validateConsistency(sku, brief, artifacts);
  const max = 15;
  const blocking = issues.filter((i) => i.blocking);
  const points = blocking.length === 0 ? max : Math.max(0, max - blocking.length * 7);
  return {
    points,
    checks: issues.map((i) => ({
      id: i.code,
      passed: !i.blocking,
      points: i.blocking ? 0 : 4,
      max_points: 4,
      blocking: i.blocking,
      message: i.message,
    })),
  };
}

export function scoreOffline(
  sku: AutonomousSku,
  brief: Record<string, unknown>,
  artifacts: Record<string, unknown>,
  attempt: number,
): QaResult & { offline_dimensions: OfflineDimensions } {
  const briefC = briefComplianceScore(sku, brief);
  const struct = structureScore(sku, artifacts);
  const consist = consistencyScore(sku, brief, artifacts);
  const copyQ = scoreCopyQuality(sku, artifacts);
  const seoB = scoreSeoBasic(sku, artifacts);
  const complete = completenessScore(sku, brief, artifacts);

  const offline_dimensions: OfflineDimensions = {
    structure: struct.points,
    completeness: complete.points,
    consistency: consist.points,
    copy_quality: copyQ.points,
    seo_basic: seoB.points,
    brief_compliance: briefC.points,
  };

  const total = Object.values(offline_dimensions).reduce((a, b) => a + b, 0);

  const allChecks: QaCheckResult[] = [
    ...briefC.checks,
    ...struct.checks,
    ...consist.checks,
    ...copyQ.issues.map((i) => ({
      id: i.code,
      passed: !i.blocking,
      points: 0,
      max_points: 2,
      blocking: i.blocking,
      message: i.message,
    })),
    ...seoB.issues.map((i) => ({
      id: i.code,
      passed: !i.blocking,
      points: 0,
      max_points: 2,
      blocking: i.blocking,
      message: i.message,
    })),
    ...complete.checks,
  ];

  const blocking = allChecks.filter((c) => c.blocking && !c.passed);
  let score = Math.min(100, total);
  if (blocking.length > 0 && score >= THRESHOLD) score = 84;

  const rubric = scoreProject(sku, brief, artifacts, attempt);
  if (!rubric.passed && rubric.blocking_failures.length > 0) {
    score = Math.min(score, rubric.score);
  }

  const passed = score >= THRESHOLD && blocking.length === 0 && rubric.blocking_failures.length === 0;

  return {
    score,
    passed,
    threshold: THRESHOLD,
    sku,
    dimensions: {
      sop_compliance: offline_dimensions.brief_compliance,
      technical: offline_dimensions.structure,
      content: offline_dimensions.copy_quality,
      conversion_or_intent: offline_dimensions.consistency,
      seo_or_tracking: offline_dimensions.seo_basic,
    },
    blocking_failures: [
      ...blocking.map((b) => ({ code: b.id, message: b.message ?? b.id, agent: "agent-qa" })),
      ...rubric.blocking_failures,
    ],
    warnings: allChecks.filter((c) => !c.passed && !c.blocking).map((c) => c.id),
    failed_agents: rubric.failed_agents.length ? rubric.failed_agents : blocking.map(() => "agent-copywriter"),
    retry_recommendation: passed
      ? null
      : {
          target_agent: rubric.failed_agents[0] ?? "agent-copywriter",
          reason: blocking[0]?.message ?? rubric.retry_recommendation?.reason ?? "Score below threshold",
          attempt,
        },
    evaluated_at: new Date().toISOString(),
    artifact_versions: rubric.artifact_versions,
    checks: allChecks,
    offline_dimensions,
  };
}
