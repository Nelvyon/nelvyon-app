import { randomUUID } from "node:crypto";

import { DbClient } from "../../../../../backend/db/DbClient";

import {
  deliverableHasFile,
  resolveDeliverableDownloadUrl,
} from "@/lib/portal/portalDeliverableStorage";

const PORTAL_VISIBLE_STATUSES = ["published", "approved_by_client", "changes_requested"] as const;
const DOWNLOADABLE_STATUSES = ["published", "approved_by_client"] as const;
const CLIENT_REVIEWED_STATUSES = new Set(["approved_by_client", "changes_requested"]);

function db() {
  return DbClient.getInstance();
}

type DeliverableRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: string | null;
  status: string;
  file_url: string | null;
  storage_key: string | null;
  version: number | null;
  published_at: string | null;
  client_reviewed_at: string | null;
  deliverable_metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

function sanitizePackSummary(meta: Record<string, unknown>): Record<string, unknown> | null {
  const report = meta.pack_report;
  if (!report || typeof report !== "object" || Array.isArray(report)) return null;
  const r = report as Record<string, unknown>;
  const kpis = r.kpis && typeof r.kpis === "object" && !Array.isArray(r.kpis)
    ? (r.kpis as Record<string, unknown>)
    : {};
  const skuResults = Array.isArray(r.sku_results) ? r.sku_results : [];
  const safeSkus = skuResults
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      sku: item.sku,
      qa_score: item.qa_score,
      passed: item.passed,
    }));
  const nextSteps = Array.isArray(r.next_steps) ? r.next_steps.map(String).slice(0, 6) : [];
  return {
    pack_name: r.pack_name,
    pack_id: r.pack_id,
    business_name: r.business_name,
    sector: r.sector,
    completed_at: r.completed_at,
    summary: r.summary,
    kpis: {
      deliverables_published: kpis.deliverables_published,
      avg_qa_score: kpis.avg_qa_score,
      skus_passed: kpis.skus_passed,
      skus_total: kpis.skus_total,
    },
    sku_results: safeSkus,
    next_steps: nextSteps,
  };
}

function deliverableDict(row: DeliverableRow): Record<string, unknown> {
  const meta = row.deliverable_metadata && typeof row.deliverable_metadata === "object"
    ? row.deliverable_metadata
    : {};
  const packSummary = sanitizePackSummary(meta);
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    file_url: row.file_url,
    has_file: Boolean(row.storage_key?.trim() || row.file_url?.trim()),
    version: row.version,
    published_at: row.published_at,
    client_reviewed_at: row.client_reviewed_at,
    client_feedback: meta.client_feedback,
    client_review_decision: meta.client_review_decision,
    updated_at: row.updated_at,
    pack_id: meta.pack_id,
    pack_run_id: meta.pack_run_id,
    sku: meta.sku,
    qa_score: meta.qa_score,
    pack_summary: packSummary,
  };
}

export async function listPortalDeliverablesBff(params: {
  workspaceId: number;
  clientId: string;
  page: number;
  pageSize: number;
  projectId?: string;
  q?: string;
}): Promise<{ items: Record<string, unknown>[]; total: number; page: number; page_size: number }> {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(200, Math.max(1, params.pageSize));
  const offset = (page - 1) * pageSize;

  const values: unknown[] = [params.workspaceId, params.clientId, ...PORTAL_VISIBLE_STATUSES];
  let projectFilter = "";
  if (params.projectId?.trim()) {
    values.push(params.projectId.trim());
    projectFilter = ` AND project_id = $${values.length}`;
  }

  let searchFilter = "";
  if (params.q?.trim()) {
    values.push(`%${params.q.trim().toLowerCase()}%`);
    const idx = values.length;
    searchFilter = ` AND (LOWER(title) LIKE $${idx} OR LOWER(COALESCE(description, '')) LIKE $${idx})`;
  }

  const statusPlaceholders = PORTAL_VISIBLE_STATUSES.map((_, i) => `$${i + 3}`).join(", ");

  const countRows = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM os_deliverables
     WHERE workspace_id = $1
       AND client_id = $2
       AND visibility = 'client_visible'
       AND status IN (${statusPlaceholders})
       ${projectFilter}
       ${searchFilter}`,
    values,
  );
  const total = Number(countRows[0]?.count ?? 0);

  values.push(pageSize, offset);
  const limitIdx = values.length - 1;
  const offsetIdx = values.length;

  const rows = await db().query<DeliverableRow>(
    `SELECT id, project_id, title, description, type, status, file_url, storage_key,
            version, published_at, client_reviewed_at, metadata AS deliverable_metadata, updated_at
     FROM os_deliverables
     WHERE workspace_id = $1
       AND client_id = $2
       AND visibility = 'client_visible'
       AND status IN (${statusPlaceholders})
       ${projectFilter}
       ${searchFilter}
     ORDER BY updated_at DESC, title ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values,
  );

  return {
    items: rows.map(deliverableDict),
    total,
    page,
    page_size: pageSize,
  };
}

const DELIVERABLE_SELECT = `SELECT id, project_id, title, description, type, status, file_url, storage_key,
            version, published_at, client_reviewed_at, metadata AS deliverable_metadata, updated_at`;

async function fetchDeliverableRow(params: {
  deliverableId: string;
  workspaceId: number;
  clientId: string;
  statuses?: readonly string[];
}): Promise<DeliverableRow | null> {
  const values: unknown[] = [params.deliverableId, params.workspaceId, params.clientId];
  let statusFilter = "";
  if (params.statuses?.length) {
    const placeholders = params.statuses.map((_, i) => `$${i + 4}`).join(", ");
    statusFilter = ` AND status IN (${placeholders})`;
    values.push(...params.statuses);
  }
  const rows = await db().query<DeliverableRow>(
    `${DELIVERABLE_SELECT}
     FROM os_deliverables
     WHERE id = $1
       AND workspace_id = $2
       AND client_id = $3
       AND visibility = 'client_visible'
       ${statusFilter}
     LIMIT 1`,
    values,
  );
  return rows[0] ?? null;
}

export async function getPortalDeliverableBff(params: {
  workspaceId: number;
  clientId: string;
  deliverableId: string;
}): Promise<Record<string, unknown> | null> {
  const row = await fetchDeliverableRow({
    deliverableId: params.deliverableId,
    workspaceId: params.workspaceId,
    clientId: params.clientId,
    statuses: PORTAL_VISIBLE_STATUSES,
  });
  return row ? deliverableDict(row) : null;
}

function reviewResultDict(row: DeliverableRow): Record<string, unknown> {
  const meta = row.deliverable_metadata && typeof row.deliverable_metadata === "object"
    ? row.deliverable_metadata
    : {};
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    status: row.status,
    client_reviewed_at: row.client_reviewed_at,
    client_feedback: meta.client_feedback,
    client_review_decision: meta.client_review_decision,
  };
}

function ensureReviewable(row: DeliverableRow): void {
  if (CLIENT_REVIEWED_STATUSES.has(row.status)) {
    throw new Error("deliverable already reviewed by client");
  }
  if (row.status !== "published") {
    throw new Error(`deliverable must be published to review (current: ${row.status})`);
  }
}

function buildReviewMetadata(
  existing: Record<string, unknown>,
  params: { portalUserId: string; decision: string; feedback: string | null; reviewedAt: string },
): Record<string, unknown> {
  const history = Array.isArray(existing.client_review_history)
    ? [...(existing.client_review_history as unknown[])]
    : [];
  history.push({
    decision: params.decision,
    feedback: params.feedback ?? "",
    portal_user_id: params.portalUserId,
    reviewed_at: params.reviewedAt,
  });
  return {
    ...existing,
    client_feedback: params.feedback ?? "",
    portal_user_id: params.portalUserId,
    reviewed_at: params.reviewedAt,
    client_review_decision: params.decision,
    client_review_history: history,
  };
}

async function recordDeliverableReview(params: {
  workspaceId: number;
  deliverableId: string;
  portalUserId: string;
  decision: "approve" | "reject";
  feedback: string | null;
}): Promise<void> {
  await db().query(
    `INSERT INTO os_deliverable_reviews
       (id, workspace_id, deliverable_id, portal_user_id, decision, feedback, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [randomUUID(), params.workspaceId, params.deliverableId, params.portalUserId, params.decision, params.feedback],
  );
}

export async function approvePortalDeliverableBff(params: {
  workspaceId: number;
  clientId: string;
  portalUserId: string;
  deliverableId: string;
  feedback?: string;
}): Promise<Record<string, unknown>> {
  const row = await fetchDeliverableRow({
    deliverableId: params.deliverableId,
    workspaceId: params.workspaceId,
    clientId: params.clientId,
  });
  if (!row) throw new Error("deliverable not found");
  ensureReviewable(row);

  const reviewedAt = new Date().toISOString();
  const meta = buildReviewMetadata(
    row.deliverable_metadata && typeof row.deliverable_metadata === "object" ? row.deliverable_metadata : {},
    {
      portalUserId: params.portalUserId,
      decision: "approve",
      feedback: params.feedback?.trim() || null,
      reviewedAt,
    },
  );

  await db().query(
    `UPDATE os_deliverables
     SET status = 'approved_by_client',
         approved_at = NOW(),
         client_reviewed_at = NOW(),
         approved_by_portal_user_id = $4,
         metadata = $5::jsonb,
         updated_at = NOW()
     WHERE id = $1 AND workspace_id = $2 AND client_id = $3`,
    [params.deliverableId, params.workspaceId, params.clientId, params.portalUserId, JSON.stringify(meta)],
  );
  await recordDeliverableReview({
    workspaceId: params.workspaceId,
    deliverableId: params.deliverableId,
    portalUserId: params.portalUserId,
    decision: "approve",
    feedback: params.feedback?.trim() || null,
  });

  const updated = await fetchDeliverableRow({
    deliverableId: params.deliverableId,
    workspaceId: params.workspaceId,
    clientId: params.clientId,
  });
  return reviewResultDict(updated ?? row);
}

export async function rejectPortalDeliverableBff(params: {
  workspaceId: number;
  clientId: string;
  portalUserId: string;
  deliverableId: string;
  feedback: string;
}): Promise<Record<string, unknown>> {
  const text = params.feedback.trim();
  if (!text) throw new Error("feedback is required");

  const row = await fetchDeliverableRow({
    deliverableId: params.deliverableId,
    workspaceId: params.workspaceId,
    clientId: params.clientId,
  });
  if (!row) throw new Error("deliverable not found");
  ensureReviewable(row);

  const reviewedAt = new Date().toISOString();
  const meta = buildReviewMetadata(
    row.deliverable_metadata && typeof row.deliverable_metadata === "object" ? row.deliverable_metadata : {},
    {
      portalUserId: params.portalUserId,
      decision: "reject",
      feedback: text,
      reviewedAt,
    },
  );

  await db().query(
    `UPDATE os_deliverables
     SET status = 'changes_requested',
         client_reviewed_at = NOW(),
         approved_by_portal_user_id = NULL,
         metadata = $4::jsonb,
         updated_at = NOW()
     WHERE id = $1 AND workspace_id = $2 AND client_id = $3`,
    [params.deliverableId, params.workspaceId, params.clientId, JSON.stringify(meta)],
  );
  await recordDeliverableReview({
    workspaceId: params.workspaceId,
    deliverableId: params.deliverableId,
    portalUserId: params.portalUserId,
    decision: "reject",
    feedback: text,
  });

  const updated = await fetchDeliverableRow({
    deliverableId: params.deliverableId,
    workspaceId: params.workspaceId,
    clientId: params.clientId,
  });
  return reviewResultDict(updated ?? row);
}

export async function resolvePortalDeliverableDownloadBff(params: {
  workspaceId: number;
  clientId: string;
  deliverableId: string;
}): Promise<string | null> {
  const row = await fetchDeliverableRow({
    deliverableId: params.deliverableId,
    workspaceId: params.workspaceId,
    clientId: params.clientId,
    statuses: DOWNLOADABLE_STATUSES,
  });
  if (!row || !deliverableHasFile(row.storage_key, row.file_url)) return null;
  return resolveDeliverableDownloadUrl({ storageKey: row.storage_key, fileUrl: row.file_url });
}
