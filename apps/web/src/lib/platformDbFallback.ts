import { DbClient } from "../../../../backend/db/DbClient";
import type { JwtPayload } from "@nelvyon/auth";
import type { WorkspaceRow } from "@/features/workspace/types";

function db() {
  return DbClient.getInstance();
}

export function platformDbFallbackEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function parseWorkspaceHeader(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function countMembers(workspaceId: number): Promise<number> {
  const rows = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workspace_members
     WHERE workspace_id = $1 AND status = 'active'`,
    [workspaceId],
  );
  return Number(rows[0]?.count ?? 0);
}

function mapWorkspaceRow(
  row: Record<string, unknown>,
  role: string,
  membersCount: number,
): WorkspaceRow {
  return {
    id: Number(row.id),
    name: String(row.name ?? "Mi Workspace"),
    slug: (row.slug as string | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    primary_color: (row.primary_color as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    plan: (row.plan as string | null) ?? null,
    status: (row.status as string | null) ?? "active",
    role,
    members_count: membersCount + 1,
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

/** List workspaces from Postgres when FastAPI workspace routes are unavailable. */
export async function dbListWorkspaces(claims: JwtPayload): Promise<WorkspaceRow[]> {
  const userId = claims.userId;
  const workspaces: WorkspaceRow[] = [];
  const seen = new Set<number>();

  const owned = await db().query<Record<string, unknown>>(
    `SELECT * FROM workspaces
     WHERE user_id = $1 AND (status = 'active' OR status IS NULL)
     ORDER BY id ASC`,
    [userId],
  );

  for (const row of owned) {
    const id = Number(row.id);
    seen.add(id);
    workspaces.push(mapWorkspaceRow(row, "owner", await countMembers(id)));
  }

  const memberRows = await db().query<Record<string, unknown>>(
    `SELECT w.*, wm.role AS member_role
     FROM workspace_members wm
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE wm.user_id = $1 AND wm.status = 'active'
     ORDER BY w.id ASC`,
    [userId],
  );

  for (const row of memberRows) {
    const id = Number(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    workspaces.push(mapWorkspaceRow(row, String(row.member_role ?? "member"), await countMembers(id)));
  }

  if (workspaces.length === 0) {
    const created = await dbCreateWorkspace(claims, { name: "Mi Workspace", slug: "default" });
    workspaces.push(created);
  }

  return workspaces;
}

export async function dbCreateWorkspace(
  claims: JwtPayload,
  body: { name: string; slug?: string | null },
): Promise<WorkspaceRow> {
  const now = new Date().toISOString();
  const rows = await db().query<Record<string, unknown>>(
    `INSERT INTO workspaces (user_id, name, slug, status, plan, created_at)
     VALUES ($1, $2, $3, 'active', $4, NOW())
     RETURNING *`,
    [claims.userId, body.name.trim() || "Mi Workspace", body.slug ?? "default", claims.plan ?? "starter"],
  );
  const ws = rows[0];
  const wsId = Number(ws.id);

  await db().query(
    `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, joined_at, created_at)
     SELECT $1, $2, $3, 'owner', 'active', $4, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2
     )`,
    [wsId, claims.userId, claims.email, now],
  );

  return mapWorkspaceRow(ws, "owner", 0);
}

export async function dbResolveWorkspaceId(req: Request, claims: JwtPayload): Promise<number> {
  const fromHeader = parseWorkspaceHeader(req);
  if (fromHeader) return fromHeader;
  const list = await dbListWorkspaces(claims);
  return list[0]?.id ?? 0;
}

export async function dbListClients(workspaceId: number, userId: string) {
  const items = await db().query<Record<string, unknown>>(
    `SELECT * FROM nelvyon_clients
     WHERE workspace_id = $1 AND user_id = $2
     ORDER BY id DESC
     LIMIT 20`,
    [workspaceId, userId],
  );
  const totalRows = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM nelvyon_clients
     WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId],
  );
  return {
    items: items.map(mapClientRow),
    total: Number(totalRows[0]?.count ?? items.length),
    skip: 0,
    limit: 20,
  };
}

function mapClientRow(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    workspace_id: row.workspace_id != null ? Number(row.workspace_id) : null,
    business_name: String(row.business_name),
    sector: String(row.sector),
    country: (row.country as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    website_url: (row.website_url as string | null) ?? null,
    value_proposition: (row.value_proposition as string | null) ?? null,
  };
}

export async function dbCreateClient(
  workspaceId: number,
  userId: string,
  data: Record<string, unknown>,
) {
  const rows = await db().query<Record<string, unknown>>(
    `INSERT INTO nelvyon_clients
       (user_id, workspace_id, business_name, sector, country, city, website_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      workspaceId,
      String(data.business_name ?? ""),
      String(data.sector ?? ""),
      (data.country as string | undefined) ?? null,
      (data.city as string | undefined) ?? null,
      (data.website_url as string | undefined) ?? null,
    ],
  );
  return mapClientRow(rows[0]);
}

export async function dbGetClient(id: number, workspaceId: number, userId: string) {
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM nelvyon_clients
     WHERE id = $1 AND workspace_id = $2 AND user_id = $3
     LIMIT 1`,
    [id, workspaceId, userId],
  );
  return rows[0] ? mapClientRow(rows[0]) : null;
}

function mapCampaignRow(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    workspace_id: row.workspace_id != null ? Number(row.workspace_id) : null,
    project_id: Number(row.project_id),
    client_id: row.client_id != null ? Number(row.client_id) : null,
    platform: String(row.platform),
    campaign_type: String(row.campaign_type),
    name: (row.name as string | null) ?? null,
    content: (row.content as string | null) ?? null,
    target_audience: (row.target_audience as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

export async function dbListCampaigns(workspaceId: number, userId: string) {
  const items = await db().query<Record<string, unknown>>(
    `SELECT * FROM nelvyon_campaigns
     WHERE workspace_id = $1 AND user_id = $2
     ORDER BY id DESC
     LIMIT 20`,
    [workspaceId, userId],
  );
  const totalRows = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM nelvyon_campaigns
     WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId],
  );
  return {
    items: items.map(mapCampaignRow),
    total: Number(totalRows[0]?.count ?? items.length),
    skip: 0,
    limit: 20,
  };
}

export async function dbCreateCampaign(
  workspaceId: number,
  userId: string,
  data: Record<string, unknown>,
) {
  const clientId = data.client_id != null ? Number(data.client_id) : null;
  const projectId = data.project_id != null ? Number(data.project_id) : clientId ?? 0;
  const rows = await db().query<Record<string, unknown>>(
    `INSERT INTO nelvyon_campaigns
       (user_id, workspace_id, project_id, client_id, platform, campaign_type, name, content, target_audience, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     RETURNING *`,
    [
      userId,
      workspaceId,
      projectId,
      clientId,
      String(data.platform ?? "email"),
      String(data.campaign_type ?? "nurturing"),
      (data.name as string | undefined) ?? null,
      (data.content as string | undefined) ?? null,
      (data.target_audience as string | undefined) ?? null,
      (data.status as string | undefined) ?? "draft",
    ],
  );
  return mapCampaignRow(rows[0]);
}

export async function dbGetCampaign(id: number, workspaceId: number, userId: string) {
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM nelvyon_campaigns
     WHERE id = $1 AND workspace_id = $2 AND user_id = $3
     LIMIT 1`,
    [id, workspaceId, userId],
  );
  return rows[0] ? mapCampaignRow(rows[0]) : null;
}
