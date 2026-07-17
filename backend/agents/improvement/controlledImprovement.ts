/**
 * Controlled improvement loop — proposals only; never mutates prod prompts/policies.
 * Cycle: metrics → detect → propose → offline eval vs baseline → require approval.
 */

export type ImprovementProposal = {
  id: string;
  area: "prompt" | "policy" | "tool" | "workflow" | "threshold";
  targetId: string;
  rationale: string;
  baselineMetric: string;
  proposedChange: string;
  risk: "low" | "medium" | "high";
  status: "proposed" | "eval_pending" | "blocked_regression" | "approved" | "rejected";
  createdAt: string;
};

export type OfflineEvalComparison = {
  proposalId: string;
  baselineScore: number;
  candidateScore: number;
  regression: boolean;
  allowed: boolean;
};

const proposals: ImprovementProposal[] = [];

export function proposeImprovement(
  input: Omit<ImprovementProposal, "id" | "status" | "createdAt">,
): ImprovementProposal {
  const p: ImprovementProposal = {
    ...input,
    id: `imp_${Date.now()}_${proposals.length}`,
    status: "proposed",
    createdAt: new Date().toISOString(),
  };
  // High risk never auto-applies
  if (input.risk === "high") {
    p.status = "eval_pending";
  }
  proposals.push(p);
  return p;
}

export function compareOfflineEval(
  proposalId: string,
  baselineScore: number,
  candidateScore: number,
  minDelta = 0,
): OfflineEvalComparison {
  const regression = candidateScore + 1e-9 < baselineScore - minDelta;
  const proposal = proposals.find((p) => p.id === proposalId);
  if (proposal) {
    proposal.status = regression ? "blocked_regression" : "eval_pending";
  }
  return {
    proposalId,
    baselineScore,
    candidateScore,
    regression,
    allowed: !regression,
  };
}

export function listImprovementProposals(): ImprovementProposal[] {
  return [...proposals];
}

export function resetImprovementProposalsForTests(): void {
  proposals.length = 0;
}

/** Fail-closed: nothing in this module writes PromptRegistry or production flags. */
export const IMPROVEMENT_LOOP_GUARANTEES = {
  autoMutateProdPrompts: false,
  autoDeploy: false,
  requireApprovalForHighRisk: true,
  blockOnRegression: true,
} as const;
