import crypto from "crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export interface SaasApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  active: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestsTotal: number;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes?: string[];
  expiresAt?: string | null;
}

export interface CreateApiKeyResult {
  key: SaasApiKey;
  rawKey: string;
}

export class SaasApiKeysError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasApiKeysError";
  }
}

type ApiKeyRow = {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  active: boolean;
  expires_at: Date | string | null;
  last_used_at: Date | string | null;
  requests_total: number | string;
  created_by: string | null;
  created_at: Date | string;
};

function rowToKey(r: ApiKeyRow): SaasApiKey {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    keyPrefix: r.key_prefix,
    scopes: r.scopes ?? [],
    active: Boolean(r.active),
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
    lastUsedAt: r.last_used_at ? new Date(r.last_used_at).toISOString() : null,
    requestsTotal: Number(r.requests_total),
    createdBy: r.created_by,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

const VALID_SCOPES = ["crm.read", "crm.write", "campaigns.read", "campaigns.write", "pipeline.read", "pipeline.write", "webhooks.read", "*"];

export class SaasApiKeysService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string): Promise<SaasApiKey[]> {
    const rows = await this.db.query<ApiKeyRow>(
      `SELECT id, tenant_id, name, key_prefix, scopes, active, expires_at, last_used_at, requests_total, created_by, created_at
       FROM api_keys WHERE tenant_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToKey);
  }

  async create(tenantId: string, userId: string | null, input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    if (!input.name.trim()) throw new SaasApiKeysError("name is required", "VALIDATION");
    const scopes = input.scopes ?? ["crm.read"];
    const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalid.length > 0) throw new SaasApiKeysError(`Invalid scopes: ${invalid.join(", ")}`, "VALIDATION");
    const rawKey = `nlv_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 12);
    const rows = await this.db.query<ApiKeyRow>(
      `INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, scopes, active, expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8)
       RETURNING id, tenant_id, name, key_prefix, scopes, active, expires_at, last_used_at, requests_total, created_by, created_at`,
      [tenantId, input.name.trim(), keyHash, keyPrefix, scopes, true, input.expiresAt ?? null, userId],
    );
    if (!rows[0]) throw new SaasApiKeysError("Failed to create API key", "VALIDATION");
    return { key: rowToKey(rows[0]), rawKey };
  }

  async revoke(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE api_keys SET active=FALSE, revoked_at=NOW() WHERE tenant_id=$1 AND id=$2 AND revoked_at IS NULL RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasApiKeysError("API key not found", "NOT_FOUND");
  }

  async verifyKey(rawKey: string): Promise<{ tenantId: string; scopes: string[] } | null> {
    try {
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const rows = await this.db.query<{ tenant_id: string; scopes: string[]; expires_at: Date | string | null }>(
        `SELECT tenant_id, scopes, expires_at FROM api_keys
       WHERE key_hash=$1 AND active=TRUE AND revoked_at IS NULL LIMIT 1`,
        [keyHash],
      );
      if (!rows[0]) return null;
      if (rows[0].expires_at && new Date(rows[0].expires_at) < new Date()) return null;
      void this.db.query(
        `UPDATE api_keys SET last_used_at=NOW(), requests_total=requests_total+1 WHERE key_hash=$1`,
        [keyHash],
      );
      return { tenantId: rows[0].tenant_id, scopes: rows[0].scopes };
    } catch {
      return null;
    }
  }
}

let _instance: SaasApiKeysService | null = null;
export function getSaasApiKeysService(): SaasApiKeysService {
  if (!_instance) _instance = new SaasApiKeysService();
  return _instance;
}
export function resetSaasApiKeysServiceForTests(): void { _instance = null; }
