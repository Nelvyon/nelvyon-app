/**
 * Independent auditor sessions — separate from producer team (ADR-053).
 * Can approve, reject with reasons, require repair, and leave evidence.
 * Default pack gate still uses runIndependentAuditor; sessions power E2E + audit trail.
 */

import {
  runIndependentAuditor,
  type IndependentAuditInput,
  type IndependentAuditResult,
} from "./OsIndependentAuditor";

export type AuditorDecision = "approved" | "rejected" | "repair_required";

export type AuditorEvidenceEntry = {
  at: string;
  action: string;
  detail: string;
  actor: "independent_auditor" | "producer_repair" | "system";
};

export type IndependentAuditSession = {
  sessionId: string;
  packId: string;
  packRunId: string;
  workspaceId: number;
  producerTeamId: string;
  auditorTeamId: "global_independent_auditor";
  status: "open" | "approved" | "rejected" | "repair_required" | "closed";
  rounds: number;
  lastResult: IndependentAuditResult | null;
  evidence: AuditorEvidenceEntry[];
  rejectionReasons: string[];
};

const sessions = new Map<string, IndependentAuditSession>();

function now(): string {
  return new Date().toISOString();
}

function pushEvidence(
  s: IndependentAuditSession,
  action: string,
  detail: string,
  actor: AuditorEvidenceEntry["actor"] = "independent_auditor",
): void {
  s.evidence.push({ at: now(), action, detail, actor });
}

export function resetIndependentAuditSessionsForTests(): void {
  sessions.clear();
}

export function getIndependentAuditSession(sessionId: string): IndependentAuditSession | undefined {
  return sessions.get(sessionId);
}

export function listIndependentAuditSessions(): IndependentAuditSession[] {
  return [...sessions.values()];
}

export function openIndependentAuditSession(input: {
  packId: string;
  packRunId: string;
  workspaceId: number;
  producerTeamId: string;
}): IndependentAuditSession {
  const sessionId = `aud-${input.packRunId}-${Date.now()}`;
  const s: IndependentAuditSession = {
    sessionId,
    packId: input.packId,
    packRunId: input.packRunId,
    workspaceId: input.workspaceId,
    producerTeamId: input.producerTeamId,
    auditorTeamId: "global_independent_auditor",
    status: "open",
    rounds: 0,
    lastResult: null,
    evidence: [],
    rejectionReasons: [],
  };
  pushEvidence(
    s,
    "session_opened",
    `producer=${input.producerTeamId} ≠ auditor=${s.auditorTeamId}`,
    "system",
  );
  sessions.set(sessionId, s);
  return s;
}

/**
 * First (or subsequent) independent review. Never the producer team.
 */
export function auditorReview(
  sessionId: string,
  auditInput: Omit<IndependentAuditInput, "packId" | "packRunId" | "workspaceId"> & {
    avgQaScore: number;
    containsMockUrl?: boolean;
    producerRole?: string;
  },
): IndependentAuditSession {
  const s = sessions.get(sessionId);
  if (!s) throw new Error(`audit_session_not_found:${sessionId}`);
  if (s.producerTeamId === "global_independent_auditor") {
    throw new Error("auditor_must_be_separate_from_producer");
  }

  const result = runIndependentAuditor({
    packId: s.packId,
    packRunId: s.packRunId,
    workspaceId: s.workspaceId,
    avgQaScore: auditInput.avgQaScore,
    critical: auditInput.critical,
    containsMockUrl: auditInput.containsMockUrl,
    producerRole: auditInput.producerRole,
  });

  s.rounds += 1;
  s.lastResult = result;

  if (!result.enabled || result.skipped) {
    s.status = "open";
    pushEvidence(s, "skipped", result.reason, "system");
    return s;
  }

  if (result.blockPublish || !result.verdict?.passed) {
    s.status = result.verdict?.requiresRepair ? "repair_required" : "rejected";
    s.rejectionReasons = result.verdict?.rejections ?? [result.reason];
    pushEvidence(
      s,
      s.status === "repair_required" ? "repair_required" : "rejected",
      result.reason,
    );
    return s;
  }

  s.status = "approved";
  s.rejectionReasons = [];
  pushEvidence(s, "approved", result.reason);
  return s;
}

export function submitProducerRepair(
  sessionId: string,
  detail: string,
): IndependentAuditSession {
  const s = sessions.get(sessionId);
  if (!s) throw new Error(`audit_session_not_found:${sessionId}`);
  if (s.status !== "repair_required" && s.status !== "rejected") {
    throw new Error(`repair_not_allowed_status:${s.status}`);
  }
  s.status = "open";
  pushEvidence(s, "repair_submitted", detail.slice(0, 500), "producer_repair");
  return s;
}

/**
 * Canonical E2E path: good → PASS; bad → REJECT+repair; repaired → PASS.
 */
export function runIndependentAuditorE2eScenario(): {
  ok: boolean;
  passSessionId: string;
  rejectThenPassSessionId: string;
  evidence: IndependentAuditSession[];
} {
  const prev = process.env.NELVYON_PACK_INDEPENDENT_AUDITOR;
  process.env.NELVYON_PACK_INDEPENDENT_AUDITOR = "1";

  try {
    const good = openIndependentAuditSession({
      packId: "social-calendar-pack",
      packRunId: "e2e-good",
      workspaceId: 2,
      producerTeamId: "svc_social_creative",
    });
    auditorReview(good.sessionId, { avgQaScore: 92, critical: true });

    const bad = openIndependentAuditSession({
      packId: "social-calendar-pack",
      packRunId: "e2e-bad",
      workspaceId: 2,
      producerTeamId: "svc_social_creative",
    });
    auditorReview(bad.sessionId, {
      avgQaScore: 70,
      critical: true,
      containsMockUrl: true,
    });
    if (bad.status !== "repair_required" && bad.status !== "rejected") {
      throw new Error(`expected_reject_got_${bad.status}`);
    }
    submitProducerRepair(bad.sessionId, "removed mock:// URLs; raised QA evidence");
    auditorReview(bad.sessionId, { avgQaScore: 93, critical: true, containsMockUrl: false });

    const ok = good.status === "approved" && bad.status === "approved" && bad.rounds >= 2;
    return {
      ok,
      passSessionId: good.sessionId,
      rejectThenPassSessionId: bad.sessionId,
      evidence: [good, bad],
    };
  } finally {
    if (prev === undefined) delete process.env.NELVYON_PACK_INDEPENDENT_AUDITOR;
    else process.env.NELVYON_PACK_INDEPENDENT_AUDITOR = prev;
  }
}
