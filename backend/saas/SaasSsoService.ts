import crypto from "crypto";
import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export interface SsoConfig {
  id: string;
  tenantId: string;
  provider: "oidc" | "saml";
  issuer: string;
  clientId: string;
  metadataUrl: string | null;
  domains: string[];
  enforced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigureSsoInput {
  provider: "oidc" | "saml";
  issuer: string;
  clientId: string;
  clientSecret: string;
  metadataUrl?: string;
  domains?: string[];
}

export interface SsoIdentity {
  id: string;
  tenantId: string;
  provider: string;
  providerSub: string;
  userId: string;
  email: string | null;
  createdAt: string;
}

export class SaasSsoError extends Error {
  constructor(message: string, public readonly code: "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "CONFIG_ERROR") {
    super(message);
    this.name = "SaasSsoError";
  }
}

export type SaasSsoServiceDeps = { db?: Pick<DbClient, "query"> };

// ── Encryption helpers (AES-256-GCM) ─────────────────────────────────────────

function getEncKey(): Buffer {
  const raw = process.env.SAAS_SSO_ENCRYPTION_KEY ?? "";
  if (!raw) throw new SaasSsoError("SAAS_SSO_ENCRYPTION_KEY env var not set", "CONFIG_ERROR");
  // Accept 32-char hex (64 hex chars) or raw 32-byte string
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  const buf = Buffer.from(raw);
  if (buf.length === 32) return buf;
  throw new SaasSsoError("SAAS_SSO_ENCRYPTION_KEY must be 32 bytes or 64-char hex", "CONFIG_ERROR");
}

export function encryptSecret(plaintext: string): string {
  const key = getEncKey();
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(ciphertext: string): string {
  const key  = getEncKey();
  const data  = Buffer.from(ciphertext, "base64");
  const iv    = data.subarray(0, 12);
  const tag   = data.subarray(12, 28);
  const body  = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(body) + decipher.final("utf8");
}

// ── OIDC redirect URL ─────────────────────────────────────────────────────────

export function buildOidcAuthUrl(params: {
  issuer: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
}): string {
  const base = params.issuer.replace(/\/$/, "");
  const url  = new URL(`${base}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id",     params.clientId);
  url.searchParams.set("redirect_uri",  params.redirectUri);
  url.searchParams.set("scope",         "openid email profile");
  url.searchParams.set("state",         params.state);
  url.searchParams.set("nonce",         params.nonce);
  return url.toString();
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasSsoService {
  constructor(private readonly deps: SaasSsoServiceDeps = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async getConfig(tenantId: string): Promise<SsoConfig | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, tenant_id, provider, issuer, client_id, metadata_url,
              domains, enforced, created_at, updated_at
       FROM saas_sso_configs WHERE tenant_id=$1 LIMIT 1`,
      [tenantId],
    );
    if (!rows[0]) return null;
    return mapConfig(rows[0]);
  }

  async upsertConfig(tenantId: string, input: ConfigureSsoInput): Promise<SsoConfig> {
    if (!input.issuer.trim()) throw new SaasSsoError("issuer is required", "VALIDATION");
    if (!input.clientId.trim()) throw new SaasSsoError("clientId is required", "VALIDATION");
    if (!input.clientSecret.trim()) throw new SaasSsoError("clientSecret is required", "VALIDATION");
    if (!["oidc", "saml"].includes(input.provider)) throw new SaasSsoError("provider must be oidc or saml", "VALIDATION");

    const domains  = (input.domains ?? []).map(d => d.toLowerCase().trim()).filter(Boolean);
    const secretEnc = encryptSecret(input.clientSecret);

    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_sso_configs
         (tenant_id, provider, issuer, client_id, client_secret_enc, metadata_url, domains)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id) DO UPDATE SET
         provider=EXCLUDED.provider, issuer=EXCLUDED.issuer,
         client_id=EXCLUDED.client_id, client_secret_enc=EXCLUDED.client_secret_enc,
         metadata_url=EXCLUDED.metadata_url, domains=EXCLUDED.domains,
         updated_at=NOW()
       RETURNING id, tenant_id, provider, issuer, client_id, metadata_url,
                 domains, enforced, created_at, updated_at`,
      [tenantId, input.provider, input.issuer.trim(), input.clientId.trim(),
       secretEnc, input.metadataUrl ?? null, JSON.stringify(domains)],
    );
    return mapConfig(rows[0]!);
  }

  async toggleEnforce(tenantId: string, enforced: boolean): Promise<SsoConfig> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_sso_configs
       SET enforced=$2, updated_at=NOW()
       WHERE tenant_id=$1
       RETURNING id, tenant_id, provider, issuer, client_id, metadata_url,
                 domains, enforced, created_at, updated_at`,
      [tenantId, enforced],
    );
    if (!rows[0]) throw new SaasSsoError("SSO not configured for tenant", "NOT_FOUND");
    return mapConfig(rows[0]);
  }

  async deleteConfig(tenantId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_sso_configs WHERE tenant_id=$1 RETURNING id`,
      [tenantId],
    );
    if (!rows[0]) throw new SaasSsoError("SSO config not found", "NOT_FOUND");
  }

  /** JIT provision: find or create identity mapping, return userId. */
  async getOrCreateIdentity(params: {
    tenantId: string;
    provider: string;
    providerSub: string;
    email?: string;
  }): Promise<SsoIdentity> {
    const { tenantId, provider, providerSub, email } = params;
    const existing = await this.db.query<Record<string, unknown>>(
      `SELECT id, tenant_id, provider, provider_sub, user_id, email, created_at
       FROM saas_sso_identities
       WHERE tenant_id=$1 AND provider=$2 AND provider_sub=$3 LIMIT 1`,
      [tenantId, provider, providerSub],
    );
    if (existing[0]) return mapIdentity(existing[0]);

    const userId = `sso_${crypto.randomUUID()}`;
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_sso_identities (tenant_id, provider, provider_sub, user_id, email)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, tenant_id, provider, provider_sub, user_id, email, created_at`,
      [tenantId, provider, providerSub, userId, email ?? null],
    );
    return mapIdentity(rows[0]!);
  }

  async listIdentities(tenantId: string): Promise<SsoIdentity[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, tenant_id, provider, provider_sub, user_id, email, created_at
       FROM saas_sso_identities WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(mapIdentity);
  }

  /** Resolve tenantId from email domain when SSO is enforced. */
  async resolveTenantByDomain(emailDomain: string): Promise<string | null> {
    const rows = await this.db.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM saas_sso_configs
       WHERE $1=ANY(domains) AND enforced=TRUE LIMIT 1`,
      [emailDomain.toLowerCase()],
    );
    return rows[0]?.tenant_id ?? null;
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapConfig(r: Record<string, unknown>): SsoConfig {
  return {
    id:          String(r.id),
    tenantId:    String(r.tenant_id),
    provider:    String(r.provider) as "oidc" | "saml",
    issuer:      String(r.issuer),
    clientId:    String(r.client_id),
    metadataUrl: r.metadata_url != null ? String(r.metadata_url) : null,
    domains:     Array.isArray(r.domains) ? (r.domains as string[]) : [],
    enforced:    Boolean(r.enforced),
    createdAt:   String(r.created_at),
    updatedAt:   String(r.updated_at),
  };
}

function mapIdentity(r: Record<string, unknown>): SsoIdentity {
  return {
    id:          String(r.id),
    tenantId:    String(r.tenant_id),
    provider:    String(r.provider),
    providerSub: String(r.provider_sub),
    userId:      String(r.user_id),
    email:       r.email != null ? String(r.email) : null,
    createdAt:   String(r.created_at),
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _svc: SaasSsoService | undefined;
export function getSaasSsoService(): SaasSsoService {
  if (!_svc) _svc = new SaasSsoService();
  return _svc;
}
export function resetSaasSsoServiceForTests(): void { _svc = undefined; }
