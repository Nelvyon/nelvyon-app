import { randomUUID } from "node:crypto";

import { DbClient } from "../../../../../backend/db/DbClient";

import type {
  GrowthPackIntakeBase,
  PackReport,
  PackRunRecord,
  PackRunStatus,
  PackStep,
} from "@/lib/packs/types";

let tableReady = false;

function db() {
  return DbClient.getInstance();
}

export async function ensurePackRunsTable(): Promise<void> {
  if (tableReady) return;
  await db().query(`
    CREATE TABLE IF NOT EXISTS nelvyon_pack_runs (
      id UUID PRIMARY KEY,
      workspace_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      pack_id TEXT NOT NULL DEFAULT 'local-business-growth',
      status TEXT NOT NULL DEFAULT 'running',
      intake JSONB NOT NULL DEFAULT '{}'::jsonb,
      saas_client_id INTEGER,
      saas_campaign_id INTEGER,
      os_client_id TEXT,
      os_project_id TEXT,
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      report JSONB,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
  await db().query(`
    CREATE INDEX IF NOT EXISTS idx_pack_runs_workspace
    ON nelvyon_pack_runs (workspace_id, created_at DESC)
  `);
  tableReady = true;
}

function initialSteps(definitions: { key: string; label: string }[]): PackStep[] {
  return definitions.map((s) => ({
    key: s.key,
    label: s.label,
    status: "pending" as const,
  }));
}

function mapRow(row: Record<string, unknown>): PackRunRecord {
  return {
    id: String(row.id),
    workspace_id: Number(row.workspace_id),
    user_id: String(row.user_id),
    pack_id: String(row.pack_id),
    status: String(row.status) as PackRunStatus,
    intake: (row.intake as GrowthPackIntakeBase & { sector: string }) ?? { business_name: "", sector: "", city: "", value_proposition: "", primary_cta: "" },
    saas_client_id: row.saas_client_id != null ? Number(row.saas_client_id) : null,
    saas_campaign_id: row.saas_campaign_id != null ? Number(row.saas_campaign_id) : null,
    os_client_id: row.os_client_id != null ? String(row.os_client_id) : null,
    os_project_id: row.os_project_id != null ? String(row.os_project_id) : null,
    steps: Array.isArray(row.steps) ? (row.steps as PackStep[]) : [],
    report: (row.report as PackReport | null) ?? null,
    error_message: row.error_message != null ? String(row.error_message) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    completed_at: row.completed_at != null ? String(row.completed_at) : null,
  };
}

export async function createPackRun(params: {
  workspaceId: number;
  userId: string;
  packId: string;
  intake: GrowthPackIntakeBase & { sector: string };
  stepDefinitions: { key: string; label: string }[];
}): Promise<PackRunRecord> {
  await ensurePackRunsTable();
  const id = randomUUID();
  const steps = initialSteps(params.stepDefinitions);
  steps[0] = { ...steps[0], status: "done", at: new Date().toISOString(), detail: "Brief validado" };

  const rows = await db().query<Record<string, unknown>>(
    `INSERT INTO nelvyon_pack_runs
       (id, workspace_id, user_id, pack_id, status, intake, steps)
     VALUES ($1, $2, $3, $4, 'running', $5::jsonb, $6::jsonb)
     RETURNING *`,
    [id, params.workspaceId, params.userId, params.packId, JSON.stringify(params.intake), JSON.stringify(steps)],
  );
  return mapRow(rows[0]);
}

export async function updatePackRun(
  id: string,
  patch: Partial<{
    status: PackRunStatus;
    steps: PackStep[];
    intake: GrowthPackIntakeBase & { sector: string };
    saas_client_id: number;
    saas_campaign_id: number;
    os_client_id: string;
    os_project_id: string;
    report: PackReport;
    error_message: string;
    completed_at: string;
  }>,
): Promise<PackRunRecord | null> {
  await ensurePackRunsTable();
  const sets: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [id];
  let i = 2;

  if (patch.status !== undefined) {
    sets.push(`status = $${i++}`);
    values.push(patch.status);
  }
  if (patch.steps !== undefined) {
    sets.push(`steps = $${i++}::jsonb`);
    values.push(JSON.stringify(patch.steps));
  }
  if (patch.intake !== undefined) {
    sets.push(`intake = $${i++}::jsonb`);
    values.push(JSON.stringify(patch.intake));
  }
  if (patch.saas_client_id !== undefined) {
    sets.push(`saas_client_id = $${i++}`);
    values.push(patch.saas_client_id);
  }
  if (patch.saas_campaign_id !== undefined) {
    sets.push(`saas_campaign_id = $${i++}`);
    values.push(patch.saas_campaign_id);
  }
  if (patch.os_client_id !== undefined) {
    sets.push(`os_client_id = $${i++}`);
    values.push(patch.os_client_id);
  }
  if (patch.os_project_id !== undefined) {
    sets.push(`os_project_id = $${i++}`);
    values.push(patch.os_project_id);
  }
  if (patch.report !== undefined) {
    sets.push(`report = $${i++}::jsonb`);
    values.push(JSON.stringify(patch.report));
  }
  if (patch.error_message !== undefined) {
    sets.push(`error_message = $${i++}`);
    values.push(patch.error_message);
  }
  if (patch.completed_at !== undefined) {
    sets.push(`completed_at = $${i++}`);
    values.push(patch.completed_at);
  }

  const rows = await db().query<Record<string, unknown>>(
    `UPDATE nelvyon_pack_runs SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getPackRun(id: string): Promise<PackRunRecord | null> {
  await ensurePackRunsTable();
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM nelvyon_pack_runs WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listPackRunsForWorkspace(
  workspaceId: number,
  limit = 10,
  packId?: string,
): Promise<PackRunRecord[]> {
  await ensurePackRunsTable();
  const rows = packId
    ? await db().query<Record<string, unknown>>(
        `SELECT * FROM nelvyon_pack_runs
         WHERE workspace_id = $1 AND pack_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [workspaceId, packId, limit],
      )
    : await db().query<Record<string, unknown>>(
        `SELECT * FROM nelvyon_pack_runs
         WHERE workspace_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [workspaceId, limit],
      );
  return rows.map(mapRow);
}

export async function listPackRunsForWorkspaces(
  workspaceIds: number[],
  limit = 50,
): Promise<PackRunRecord[]> {
  if (workspaceIds.length === 0) return [];
  await ensurePackRunsTable();
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM nelvyon_pack_runs
     WHERE workspace_id = ANY($1::int[])
     ORDER BY created_at DESC
     LIMIT $2`,
    [workspaceIds, limit],
  );
  return rows.map(mapRow);
}

export async function findLatestPackRunBySaasClient(
  workspaceId: number,
  saasClientId: number,
): Promise<PackRunRecord | null> {
  await ensurePackRunsTable();
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM nelvyon_pack_runs
     WHERE workspace_id = $1 AND saas_client_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [workspaceId, saasClientId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export function markStep(
  steps: PackStep[],
  key: string,
  status: PackStep["status"],
  detail?: string,
): PackStep[] {
  return steps.map((s) =>
    s.key === key ? { ...s, status, detail, at: new Date().toISOString() } : s,
  );
}
