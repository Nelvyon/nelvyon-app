import { DbClient } from "../../../../../backend/db/DbClient";

const PORTAL_PROJECT_STATUSES = ["active", "paused", "completed"] as const;

function db() {
  return DbClient.getInstance();
}

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  updated_at: string | null;
  project_metadata: Record<string, unknown> | null;
};

function projectDict(row: ProjectRow): Record<string, unknown> {
  const meta = row.project_metadata && typeof row.project_metadata === "object" ? row.project_metadata : {};
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    start_date: row.start_date,
    due_date: row.due_date,
    updated_at: row.updated_at,
    pack_id: meta.pack_id,
    pack_run_id: meta.pack_run_id,
  };
}

export async function listPortalProjectsBff(params: {
  workspaceId: number;
  clientId: string;
  page: number;
  pageSize: number;
  q?: string;
}): Promise<{ items: Record<string, unknown>[]; total: number; page: number; page_size: number }> {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(200, Math.max(1, params.pageSize));
  const offset = (page - 1) * pageSize;

  const values: unknown[] = [params.workspaceId, params.clientId, ...PORTAL_PROJECT_STATUSES];
  let searchFilter = "";
  if (params.q?.trim()) {
    values.push(`%${params.q.trim().toLowerCase()}%`);
    const idx = values.length;
    searchFilter = ` AND (LOWER(name) LIKE $${idx} OR LOWER(COALESCE(description, '')) LIKE $${idx})`;
  }

  const statusPlaceholders = PORTAL_PROJECT_STATUSES.map((_, i) => `$${i + 3}`).join(", ");

  const countRows = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM os_projects
     WHERE workspace_id = $1
       AND client_id = $2
       AND status IN (${statusPlaceholders})
       ${searchFilter}`,
    values,
  );
  const total = Number(countRows[0]?.count ?? 0);

  values.push(pageSize, offset);
  const limitIdx = values.length - 1;
  const offsetIdx = values.length;

  const rows = await db().query<ProjectRow>(
    `SELECT id, name, description, status, start_date, due_date, updated_at,
            metadata AS project_metadata
     FROM os_projects
     WHERE workspace_id = $1
       AND client_id = $2
       AND status IN (${statusPlaceholders})
       ${searchFilter}
     ORDER BY updated_at DESC, name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values,
  );

  return { items: rows.map(projectDict), total, page, page_size: pageSize };
}

export async function getPortalProjectBff(params: {
  workspaceId: number;
  clientId: string;
  projectId: string;
}): Promise<Record<string, unknown> | null> {
  const rows = await db().query<ProjectRow>(
    `SELECT id, name, description, status, start_date, due_date, updated_at,
            metadata AS project_metadata
     FROM os_projects
     WHERE id = $1
       AND workspace_id = $2
       AND client_id = $3
       AND status IN ('active', 'paused', 'completed')
     LIMIT 1`,
    [params.projectId, params.workspaceId, params.clientId],
  );
  const row = rows[0];
  return row ? projectDict(row) : null;
}
