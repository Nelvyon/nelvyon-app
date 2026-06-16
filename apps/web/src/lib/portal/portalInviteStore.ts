import { createHash, randomBytes, randomUUID } from "node:crypto";

import { DbClient } from "../../../../../backend/db/DbClient";

function db() {
  return DbClient.getInstance();
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export async function createPortalInviteBff(params: {
  workspaceId: number;
  clientId: string;
  email: string;
  createdByUserId: string;
}): Promise<{
  invite_id: string;
  email: string;
  client_id: string;
  expires_at: string;
  token: string;
}> {
  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error("email is required");

  const clients = await db().query<{ id: string }>(
    `SELECT id FROM os_clients
     WHERE id = $1 AND workspace_id = $2 AND status = 'active'
     LIMIT 1`,
    [params.clientId, params.workspaceId],
  );
  if (!clients[0]) throw new Error("client_id not found in workspace");

  const existing = await db().query<{ id: string }>(
    `SELECT id FROM os_portal_users
     WHERE workspace_id = $1 AND LOWER(email) = $2 AND status = 'active'
     LIMIT 1`,
    [params.workspaceId, email],
  );
  if (existing[0]) throw new Error("portal user already exists for this email in workspace");

  const rawToken = randomBytes(32).toString("base64url");
  const inviteId = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db().query(
    `INSERT INTO os_portal_invites
       (id, workspace_id, client_id, email, token_hash, role, expires_at, created_by_user_id, created_at)
     VALUES ($1, $2, $3, $4, $5, 'viewer', $6, $7, NOW())`,
    [inviteId, params.workspaceId, params.clientId, email, hashToken(rawToken), expiresAt, params.createdByUserId],
  );

  return {
    invite_id: inviteId,
    email,
    client_id: params.clientId,
    expires_at: expiresAt,
    token: rawToken,
  };
}

export async function listPortalInvitesBff(params: {
  workspaceId: number;
  clientId: string;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const rows = await db().query<{
    id: string;
    email: string;
    client_id: string;
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
  }>(
    `SELECT id, email, client_id, expires_at, accepted_at, created_at
     FROM os_portal_invites
     WHERE workspace_id = $1 AND client_id = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [params.workspaceId, params.clientId],
  );

  const now = Date.now();
  const items = rows.map((row) => {
    let status = "pending";
    if (row.accepted_at) status = "accepted";
    else if (new Date(row.expires_at).getTime() < now) status = "expired";
    return {
      id: row.id,
      email: row.email,
      client_id: row.client_id,
      status,
      expires_at: row.expires_at,
      accepted_at: row.accepted_at,
      created_at: row.created_at,
    };
  });

  return { items, total: items.length };
}
