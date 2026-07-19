/**
 * Canary → promote → monitor → auto-rollback gates.
 * Wraps controlledImprovement; never mutates production PromptRegistry.
 */

import {
  compareOfflineEval,
  promoteImprovement,
  proposeImprovement,
  rollbackImprovement,
  type ImprovementProposal,
} from "../improvement/controlledImprovement";

export type CanaryState =
  | "proposed"
  | "offline_eval"
  | "adversarial_ok"
  | "security_ok"
  | "resource_ok"
  | "approved"
  | "canary"
  | "promoted"
  | "rolled_back"
  | "blocked";

export type CanaryRecord = {
  id: string;
  targetId: string;
  proposalId: string;
  state: CanaryState;
  metrics: {
    offlineDelta: number;
    securityPass: boolean;
    isolationPass: boolean;
    hallucinationOk: boolean;
    resourceOk: boolean;
    sloOk: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

const canaries: CanaryRecord[] = [];

export type PromotionGateInput = {
  securityWorse: boolean;
  isolationWorse: boolean;
  hallucinationUp: boolean;
  criticalAccuracyDown: boolean;
  resourceExcess: boolean;
  sloBreach: boolean;
  rollbackLost: boolean;
};

export function promotionAllowed(gates: PromotionGateInput): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (gates.securityWorse) blockers.push("security_regression");
  if (gates.isolationWorse) blockers.push("isolation_regression");
  if (gates.hallucinationUp) blockers.push("hallucination_regression");
  if (gates.criticalAccuracyDown) blockers.push("accuracy_regression");
  if (gates.resourceExcess) blockers.push("resource_excess");
  if (gates.sloBreach) blockers.push("slo_breach");
  if (gates.rollbackLost) blockers.push("rollback_unavailable");
  return { ok: blockers.length === 0, blockers };
}

export function startCanaryImprovement(input: {
  targetId: string;
  rationale: string;
  proposedChange: string;
  baselineMetric: string;
  risk?: ImprovementProposal["risk"];
}): { proposal: ImprovementProposal; canary: CanaryRecord } {
  const proposal = proposeImprovement({
    area: "prompt",
    targetId: input.targetId,
    rationale: input.rationale,
    baselineMetric: input.baselineMetric,
    proposedChange: input.proposedChange,
    risk: input.risk ?? "medium",
  });
  const now = new Date().toISOString();
  const canary: CanaryRecord = {
    id: `canary_${Date.now()}_${canaries.length}`,
    targetId: input.targetId,
    proposalId: proposal.id,
    state: "proposed",
    metrics: {
      offlineDelta: 0,
      securityPass: false,
      isolationPass: false,
      hallucinationOk: false,
      resourceOk: false,
      sloOk: false,
    },
    createdAt: now,
    updatedAt: now,
  };
  canaries.push(canary);
  return { proposal, canary };
}

export function runCanaryGates(
  canaryId: string,
  scores: { baseline: number; candidate: number },
  gates: PromotionGateInput,
): CanaryRecord {
  const c = canaries.find((x) => x.id === canaryId);
  if (!c) throw new Error("canary_not_found");

  const cmp = compareOfflineEval(c.proposalId, scores.baseline, scores.candidate);
  c.metrics.offlineDelta = scores.candidate - scores.baseline;
  c.metrics.securityPass = !gates.securityWorse;
  c.metrics.isolationPass = !gates.isolationWorse;
  c.metrics.hallucinationOk = !gates.hallucinationUp;
  c.metrics.resourceOk = !gates.resourceExcess;
  c.metrics.sloOk = !gates.sloBreach;

  const allowed = promotionAllowed(gates);
  if (!cmp.allowed || !allowed.ok) {
    c.state = "blocked";
  } else {
    c.state = "approved";
  }
  c.updatedAt = new Date().toISOString();
  return c;
}

export function enterCanary(canaryId: string): CanaryRecord {
  const c = canaries.find((x) => x.id === canaryId);
  if (!c) throw new Error("canary_not_found");
  if (c.state !== "approved") throw new Error("not_approved");
  c.state = "canary";
  c.updatedAt = new Date().toISOString();
  return c;
}

export function promoteCanary(
  canaryId: string,
  opts: { approvedBy: string; version: string },
): CanaryRecord {
  const c = canaries.find((x) => x.id === canaryId);
  if (!c) throw new Error("canary_not_found");
  if (c.state !== "canary" && c.state !== "approved") throw new Error("invalid_state");
  promoteImprovement(c.proposalId, {
    approvedBy: opts.approvedBy,
    approval: true,
    version: opts.version,
  });
  c.state = "promoted";
  c.updatedAt = new Date().toISOString();
  return c;
}

export function autoRollbackCanary(canaryId: string, reason: string): CanaryRecord {
  const c = canaries.find((x) => x.id === canaryId);
  if (!c) throw new Error("canary_not_found");
  rollbackImprovement(c.targetId, { by: `auto:${reason}` });
  c.state = "rolled_back";
  c.updatedAt = new Date().toISOString();
  return c;
}

export function listCanaries(): CanaryRecord[] {
  return [...canaries];
}

export function resetCanariesForTests(): void {
  canaries.length = 0;
}
