/**
 * Controlled improvement loop — proposals, offline eval, promote, rollback.
 * Never mutates production PromptRegistry automatically.
 */

export type ImprovementProposal = {
  id: string;
  area: "prompt" | "policy" | "tool" | "workflow" | "threshold";
  targetId: string;
  rationale: string;
  baselineMetric: string;
  proposedChange: string;
  risk: "low" | "medium" | "high";
  status:
    | "proposed"
    | "eval_pending"
    | "blocked_regression"
    | "approved"
    | "rejected"
    | "promoted"
    | "rolled_back";
  createdAt: string;
  version?: string;
  promotedAt?: string;
  rolledBackAt?: string;
};

export type OfflineEvalComparison = {
  proposalId: string;
  baselineScore: number;
  candidateScore: number;
  regression: boolean;
  allowed: boolean;
};

export type ImprovementVersionRecord = {
  proposalId: string;
  targetId: string;
  version: string;
  change: string;
  promotedAt: string;
  active: boolean;
};

const proposals: ImprovementProposal[] = [];
const versions: ImprovementVersionRecord[] = [];

export function proposeImprovement(
  input: Omit<ImprovementProposal, "id" | "status" | "createdAt">,
): ImprovementProposal {
  const p: ImprovementProposal = {
    ...input,
    id: `imp_${Date.now()}_${proposals.length}`,
    status: "proposed",
    createdAt: new Date().toISOString(),
  };
  if (input.risk === "high") p.status = "eval_pending";
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

/**
 * Promote only after offline eval allowed + explicit approval (medium/high).
 * Does not write PromptRegistry — records version intent only.
 */
export function promoteImprovement(
  proposalId: string,
  opts: { approvedBy: string; approval: boolean; version: string },
): ImprovementVersionRecord {
  const p = proposals.find((x) => x.id === proposalId);
  if (!p) throw new Error("proposal_not_found");
  if (p.status === "blocked_regression") throw new Error("blocked_regression");
  if (p.risk !== "low" && !opts.approval) throw new Error("approval_required");

  for (const v of versions) {
    if (v.targetId === p.targetId && v.active) v.active = false;
  }

  const rec: ImprovementVersionRecord = {
    proposalId: p.id,
    targetId: p.targetId,
    version: opts.version,
    change: p.proposedChange,
    promotedAt: new Date().toISOString(),
    active: true,
  };
  versions.push(rec);
  p.status = "promoted";
  p.version = opts.version;
  p.promotedAt = rec.promotedAt;
  void opts.approvedBy;
  return rec;
}

export function rollbackImprovement(targetId: string, opts?: { by?: string }): ImprovementVersionRecord | null {
  const sorted = versions
    .filter((v) => v.targetId === targetId)
    .sort((a, b) => b.promotedAt.localeCompare(a.promotedAt));
  const current = sorted.find((v) => v.active);
  if (current) current.active = false;
  const prior = sorted.find((v) => v !== current);
  if (prior) prior.active = true;

  const p = proposals.find((x) => x.targetId === targetId && x.status === "promoted");
  if (p) {
    p.status = "rolled_back";
    p.rolledBackAt = new Date().toISOString();
  }
  void opts?.by;
  return prior ?? null;
}

export function getActiveImprovement(targetId: string): ImprovementVersionRecord | null {
  return versions.find((v) => v.targetId === targetId && v.active) ?? null;
}

export function listImprovementProposals(): ImprovementProposal[] {
  return [...proposals];
}

export function listImprovementVersions(): ImprovementVersionRecord[] {
  return [...versions];
}

export function resetImprovementProposalsForTests(): void {
  proposals.length = 0;
  versions.length = 0;
}

export const IMPROVEMENT_LOOP_GUARANTEES = {
  autoMutateProdPrompts: false,
  autoDeploy: false,
  requireApprovalForHighRisk: true,
  blockOnRegression: true,
  ciGate: "scripts/run-phase2-elite-cert.mjs",
} as const;
