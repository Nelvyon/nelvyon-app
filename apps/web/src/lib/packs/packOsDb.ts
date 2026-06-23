import { randomUUID } from "node:crypto";

import { DbClient } from "../../../../../backend/db/DbClient";

function db() {
  return DbClient.getInstance();
}

export async function dbCreateOsClient(params: {
  workspaceId: number;
  userId: string;
  business_name: string;
  sector: string;
  city?: string;
  country?: string;
  contact_email?: string;
  contact_name?: string;
  website_url?: string;
  value_proposition?: string;
}): Promise<string> {
  const id = randomUUID();
  await db().query(
    `INSERT INTO os_clients
       (id, workspace_id, created_by_user_id, business_name, sector, city, country,
        contact_email, contact_name, website_url, value_proposition, status, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', '{}'::jsonb, NOW(), NOW())`,
    [
      id,
      params.workspaceId,
      params.userId,
      params.business_name,
      params.sector,
      params.city ?? null,
      params.country ?? "ES",
      params.contact_email ?? null,
      params.contact_name ?? null,
      params.website_url ?? null,
      params.value_proposition ?? null,
    ],
  );
  return id;
}

export async function dbCreateOsProject(params: {
  workspaceId: number;
  clientId: string;
  name: string;
  description?: string;
  packRunId: string;
  packId: string;
}): Promise<string> {
  const id = randomUUID();
  await db().query(
    `INSERT INTO os_projects
       (id, workspace_id, client_id, name, description, status, priority, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', 'high', $6::jsonb, NOW(), NOW())`,
    [
      id,
      params.workspaceId,
      params.clientId,
      params.name,
      params.description ?? null,
      JSON.stringify({ pack_id: params.packId, pack_run_id: params.packRunId }),
    ],
  );
  return id;
}

export type PackDeliverableInput = {
  workspaceId: number;
  clientId: string;
  projectId: string;
  title: string;
  type: string;
  file_url?: string | null;
  visibility: "client_visible" | "internal";
  metadata: Record<string, unknown>;
};

/**
 * Bulk-approve all client_visible deliverables for a project when QA ≥ threshold.
 * Sets status → approved_by_client without human portal interaction.
 * Returns count of rows updated.
 */
export async function dbAutoApprovePackDeliverables(params: {
  workspaceId: number;
  projectId: string;
}): Promise<number> {
  const rows = await db().query<{ id: string }>(
    `UPDATE os_deliverables
     SET status = 'approved_by_client',
         approved_at = NOW(),
         client_reviewed_at = NOW(),
         metadata = metadata || '{"auto_approved":true,"auto_approve_reason":"qa_score_gte_85"}'::jsonb,
         updated_at = NOW()
     WHERE workspace_id = $1
       AND project_id = $2
       AND visibility = 'client_visible'
       AND status = 'published'
     RETURNING id`,
    [params.workspaceId, params.projectId],
  );
  return rows.length;
}

/** Pack mode: deliverables go straight to portal (published + client_visible). */
export async function dbCreatePackDeliverable(input: PackDeliverableInput): Promise<string> {
  const id = randomUUID();
  const clientVisible = input.visibility === "client_visible";
  await db().query(
    `INSERT INTO os_deliverables
       (id, workspace_id, client_id, project_id, title, type, status, visibility,
        file_url, metadata, version, delivered_at, approved_at, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 1,
             CASE WHEN $11 THEN NOW() ELSE NULL END,
             CASE WHEN $11 THEN NOW() ELSE NULL END,
             CASE WHEN $11 THEN NOW() ELSE NULL END,
             NOW(), NOW())`,
    [
      id,
      input.workspaceId,
      input.clientId,
      input.projectId,
      input.title,
      input.type,
      clientVisible ? "published" : "in_review",
      input.visibility,
      input.file_url ?? null,
      JSON.stringify(input.metadata),
      clientVisible,
    ],
  );
  return id;
}
