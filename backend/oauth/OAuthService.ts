import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { DbClient } from "../db/DbClient";
import { createLogger } from "../logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

export type OAuthProvider = "google" | "meta" | "tiktok" | "linkedin";

export interface OAuthConnection {
  id: string;
  userId: string;
  provider: OAuthProvider;
  scopes: string[];
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountId?: string;
  accountName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthConnectionSummary {
  id: string;
  provider: OAuthProvider;
  externalAccountName?: string;
  externalAccountId?: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionRow {
  id: string;
  user_id: string;
  provider: OAuthProvider;
  scopes: string[];
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  external_account_id: string | null;
  external_account_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SummaryRow {
  id: string;
  provider: OAuthProvider;
  external_account_name: string | null;
  external_account_id: string | null;
  scopes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function encryptionKeyBuffer(): Buffer {
  const key = process.env.OAUTH_ENCRYPTION_KEY ?? "";
  return Buffer.from(key, "hex");
}

export function encrypt(text: string): string {
  const key = encryptionKeyBuffer();
  if (key.length !== 32) {
    throw new Error("OAUTH_ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encrypted: string): string {
  const key = encryptionKeyBuffer();
  if (key.length !== 32) {
    throw new Error("OAUTH_ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }
  const [ivHex, authTagHex, encHex] = encrypted.split(":");
  if (!ivHex || !authTagHex || !encHex) {
    throw new Error("Invalid encrypted token format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function mapConnection(row: ConnectionRow, decrypted: { accessToken: string; refreshToken?: string }): OAuthConnection {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    scopes: row.scopes ?? [],
    accessToken: decrypted.accessToken,
    refreshToken: decrypted.refreshToken,
    expiresAt: row.token_expires_at ? new Date(row.token_expires_at) : undefined,
    accountId: row.external_account_id ?? undefined,
    accountName: row.external_account_name ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

let inst: OAuthService | undefined;

export class OAuthService {
  private readonly db: DbClient;
  private readonly logger = createLogger("oauth");

  private constructor() {
    this.db = DbClient.getInstance();
  }

  static instance(): OAuthService {
    if (!inst) inst = new OAuthService();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  async saveConnection(
    userId: string,
    provider: string,
    data: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
      accountId?: string;
      accountName?: string;
      scopes: string[];
    },
  ): Promise<void> {
    const encAccess = encrypt(data.accessToken);
    const encRefresh = data.refreshToken ? encrypt(data.refreshToken) : null;

    await this.db.query(
      `INSERT INTO oauth_connections (
         user_id, provider, access_token, refresh_token, token_expires_at,
         external_account_id, external_account_name, scopes, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       ON CONFLICT (user_id, provider) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         external_account_id = EXCLUDED.external_account_id,
         external_account_name = EXCLUDED.external_account_name,
         scopes = EXCLUDED.scopes,
         is_active = true,
         updated_at = now()`,
      [
        userId,
        provider,
        encAccess,
        encRefresh,
        data.expiresAt ?? null,
        data.accountId ?? null,
        data.accountName ?? null,
        data.scopes,
      ],
    );
    this.logger.info("oauth_connection_saved", { userId, provider });
  }

  async getConnection(userId: string, provider: string): Promise<OAuthConnection | null> {
    const rows = await this.db.query<ConnectionRow>(
      `SELECT * FROM oauth_connections
       WHERE user_id = $1 AND provider = $2 AND is_active = true
       LIMIT 1`,
      [userId, provider],
    );
    if (rows.length === 0) return null;
    const row = rows[0]!;
    return mapConnection(row, {
      accessToken: decrypt(row.access_token),
      refreshToken: row.refresh_token ? decrypt(row.refresh_token) : undefined,
    });
  }

  async deleteConnection(userId: string, provider: string): Promise<void> {
    await this.db.query(
      `UPDATE oauth_connections
       SET is_active = false, updated_at = now()
       WHERE user_id = $1 AND provider = $2`,
      [userId, provider],
    );
    this.logger.info("oauth_connection_deleted", { userId, provider });
  }

  async listConnections(userId: string): Promise<OAuthConnectionSummary[]> {
    const rows = await this.db.query<SummaryRow>(
      `SELECT id, provider, external_account_name, external_account_id, scopes, is_active, created_at, updated_at
       FROM oauth_connections
       WHERE user_id = $1 AND is_active = true`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      externalAccountName: r.external_account_name ?? undefined,
      externalAccountId: r.external_account_id ?? undefined,
      scopes: r.scopes ?? [],
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}
