/**
 * C35 — Human QA review queue for pack runs below auto-approve threshold.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type QaReviewStatus = "pending" | "approved" | "rejected";

export type QaReviewItem = {
  id: string;
  tenantId: string | null;
  packRunId: string | null;
  deliverableId: string | null;
  qaScore: number;
  status: QaReviewStatus;
  reviewerNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type QaReviewSummary = {
  pending: number;
  approved: number;
  rejected: number;
  avgPendingScore: number;
};

export class OsQaReviewQueueError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "VALIDATION", message: string) {
    super(message);
    this.name = "OsQaReviewQueueError";
  }
}

type Row = {
  id: string;
  tenant_id: string | null;
  pack_run_id: string | null;
  deliverable_id: string | null;
  qa_score: number | string;
  status: QaReviewStatus;
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function rowToItem(r: Row): QaReviewItem {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    packRunId: r.pack_run_id,
    deliverableId: r.deliverable_id,
    qaScore: Number(r.qa_score),
    status: r.status,
    reviewerNotes: r.reviewer_notes,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  };
}

export class OsQaReviewQueueService {
  constructor(private readonly db: SaasPostgresPort) {}

  async enqueue(input: {
    tenantId?: string | null;
    packRunId?: string | null;
    deliverableId?: string | null;
    qaScore: number;
  }): Promise<QaReviewItem> {
    if (input.qaScore < 1 || input.qaScore > 100) {
      throw new OsQaReviewQueueError("VALIDATION", "qaScore debe estar entre 1 y 100");
    }
    const rows = await this.db.query<Row>(
      `INSERT INTO os_qa_review_queue (tenant_id, pack_run_id, deliverable_id, qa_score, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [input.tenantId ?? null, input.packRunId ?? null, input.deliverableId ?? null, input.qaScore],
    );
    if (!rows[0]) throw new OsQaReviewQueueError("VALIDATION", "No se pudo encolar revisión");
    return rowToItem(rows[0]);
  }

  async list(status?: QaReviewStatus, limit = 50): Promise<QaReviewItem[]> {
    const rows = status
      ? await this.db.query<Row>(
          `SELECT * FROM os_qa_review_queue WHERE status = $1 ORDER BY created_at DESC LIMIT $2`,
          [status, limit],
        )
      : await this.db.query<Row>(
          `SELECT * FROM os_qa_review_queue ORDER BY created_at DESC LIMIT $1`,
          [limit],
        );
    return rows.map(rowToItem);
  }

  async getSummary(): Promise<QaReviewSummary> {
    const rows = await this.db.query<{
      status: QaReviewStatus;
      cnt: string;
      avg_score: string | null;
    }>(
      `SELECT status, COUNT(*)::text AS cnt,
              CASE WHEN status = 'pending' THEN AVG(qa_score)::text ELSE NULL END AS avg_score
       FROM os_qa_review_queue
       GROUP BY status`,
      [],
    );
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let avgPendingScore = 0;
    for (const r of rows) {
      const n = Number(r.cnt);
      if (r.status === "pending") {
        pending = n;
        avgPendingScore = Number(r.avg_score ?? 0);
      } else if (r.status === "approved") approved = n;
      else if (r.status === "rejected") rejected = n;
    }
    return { pending, approved, rejected, avgPendingScore: Math.round(avgPendingScore) };
  }

  async review(id: string, status: "approved" | "rejected", notes?: string): Promise<QaReviewItem> {
    const rows = await this.db.query<Row>(
      `UPDATE os_qa_review_queue
       SET status = $2, reviewer_notes = COALESCE($3, reviewer_notes), reviewed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, status, notes ?? null],
    );
    if (!rows[0]) throw new OsQaReviewQueueError("NOT_FOUND", `Item ${id} no encontrado o ya revisado`);
    return rowToItem(rows[0]);
  }
}

let _instance: OsQaReviewQueueService | null = null;

export function getOsQaReviewQueueService(): OsQaReviewQueueService {
  if (!_instance) {
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsQaReviewQueueService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsQaReviewQueueServiceForTests(): void {
  _instance = null;
}
