import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import jwt from "jsonwebtoken";

import { DbClient } from "../../../../../backend/db/DbClient";

function db() {
  return DbClient.getInstance();
}

const PBKDF2_ITERATIONS = 260_000;

function jwtSecret(): string {
  return (
    process.env.JWT_SECRET_KEY?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    ""
  );
}

export function hashPortalPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${salt}$${digest}`;
}

export function verifyPortalPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "pbkdf2_sha256") return false;
  const [, salt, expected] = parts;
  const digest = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, "sha256").toString("hex");
  try {
    return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function issuePortalToken(user: {
  id: string;
  email: string;
  name: string | null;
  client_id: string;
  workspace_id: number;
}): string {
  const secret = jwtSecret();
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: "portal_viewer",
      portal: true,
      client_id: user.client_id,
      workspace_id: user.workspace_id,
    },
    secret,
    { algorithm: "HS256", expiresIn: "7d" },
  );
}

export async function acceptPortalInviteBff(params: {
  token: string;
  password: string;
  name?: string;
}): Promise<{ access_token: string; token_type: string; user: Record<string, unknown> }> {
  const raw = params.token.trim();
  if (!raw) throw new Error("token is required");
  if (!params.password || params.password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }

  const rows = await db().query<{
    id: string;
    workspace_id: number;
    client_id: string;
    email: string;
    expires_at: string;
    accepted_at: string | null;
  }>(
    `SELECT id, workspace_id, client_id, email, expires_at, accepted_at
     FROM os_portal_invites WHERE token_hash = $1 LIMIT 1`,
    [hashToken(raw)],
  );
  const invite = rows[0];
  if (!invite) throw new Error("invalid or expired invite token");
  if (invite.accepted_at) throw new Error("invite already accepted");
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error("invalid or expired invite token");
  }

  const dup = await db().query<{ id: string }>(
    `SELECT id FROM os_portal_users
     WHERE workspace_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
    [invite.workspace_id, invite.email],
  );
  if (dup[0]) throw new Error("portal user already exists for this email");

  const userId = randomUUID();
  const passwordHash = hashPortalPassword(params.password);
  const name = params.name?.trim() || null;

  await db().query(
    `INSERT INTO os_portal_users
       (id, workspace_id, client_id, email, password_hash, name, status, invite_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, NOW(), NOW())`,
    [userId, invite.workspace_id, invite.client_id, invite.email, passwordHash, name, invite.id],
  );
  await db().query(`UPDATE os_portal_invites SET accepted_at = NOW() WHERE id = $1`, [invite.id]);

  const user = {
    id: userId,
    email: invite.email,
    name,
    client_id: invite.client_id,
    workspace_id: invite.workspace_id,
  };

  return {
    access_token: issuePortalToken(user),
    token_type: "bearer",
    user,
  };
}

export async function getPortalUserBff(params: {
  portalUserId: string;
  workspaceId: number;
  clientId: string;
}): Promise<Record<string, unknown> | null> {
  const rows = await db().query<{
    id: string;
    email: string;
    name: string | null;
    client_id: string;
    workspace_id: number;
  }>(
    `SELECT id, email, name, client_id, workspace_id
     FROM os_portal_users
     WHERE id = $1 AND workspace_id = $2 AND client_id = $3 AND status = 'active'
     LIMIT 1`,
    [params.portalUserId, params.workspaceId, params.clientId],
  );
  const user = rows[0];
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    client_id: user.client_id,
    workspace_id: user.workspace_id,
  };
}

export async function loginPortalUserBff(params: {
  email: string;
  password: string;
}): Promise<{ access_token: string; token_type: string; user: Record<string, unknown> }> {
  const email = params.email.trim().toLowerCase();
  if (!email || !params.password) throw new Error("email and password are required");

  const rows = await db().query<{
    id: string;
    email: string;
    name: string | null;
    client_id: string;
    workspace_id: number;
    password_hash: string;
  }>(
    `SELECT id, email, name, client_id, workspace_id, password_hash
     FROM os_portal_users
     WHERE LOWER(email) = $1 AND status = 'active'
     LIMIT 1`,
    [email],
  );
  const user = rows[0];
  if (!user || !verifyPortalPassword(params.password, user.password_hash)) {
    throw new Error("invalid email or password");
  }

  await db().query(`UPDATE os_portal_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [
    user.id,
  ]);

  return {
    access_token: issuePortalToken(user),
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      client_id: user.client_id,
      workspace_id: user.workspace_id,
    },
  };
}
