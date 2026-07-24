/**
 * OAuth multi-tenant framework — mock providers only (ADR-056 block 16).
 *
 * Provides a tenant-scoped OAuth connection lifecycle (authorize → callback →
 * rotate → revoke → reconnect → delete) with an AES-256-GCM token vault, PKCE,
 * CSRF state, and a minimum-scopes policy per provider. Reuses the encryption
 * pattern from `backend/oauth/OAuthService.ts` (AES-256-GCM, `iv:authTag:cipher`
 * hex encoding) but is a fully independent module with its own key so it never
 * touches production OAuth connections.
 *
 * Every provider adapter here (`google`, `meta`, `linkedin`, `twilio`) is a MOCK:
 * `mockExchangeCode`/`mockRefresh` synthesize deterministic fake tokens and never
 * perform an HTTP request. There is no code path in this file that reaches a
 * real OAuth authorization server.
 *
 * Fail-closed encryption key: `NELVYON_OAUTH_MT_ENCRYPTION_KEY` (64 hex chars /
 * 32 bytes) is required outside test runtime. A fixed test-only key is used ONLY
 * when `NODE_ENV === "test"` or `VITEST === "true"` — production/staging without
 * the real env var throws immediately rather than silently using a weak key.
 *
 * See `docs/ops/OAUTH_PROVIDER_APPS_CEO_CHECKLIST.md` for what the CEO must do
 * before any of these providers can become real (client IDs/secrets, consent
 * screens, redirect URIs, scopes review).
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
/** Fixed 32-byte key, test runtime only — never valid outside NODE_ENV=test/VITEST=true. */
const TEST_ONLY_KEY_HEX = "ab".repeat(32);
const STATE_TTL_MS = 10 * 60_000;

export type OAuthMtProviderId = "google" | "meta" | "linkedin" | "twilio";

export type OAuthMtConnectionStatus = "connected" | "revoked" | "expired";

export type OAuthMtAuditAction =
  | "authorization_started"
  | "authorization_completed"
  | "token_rotated"
  | "connection_revoked"
  | "connection_reconnected"
  | "connection_deleted"
  | "state_rejected"
  | "pkce_rejected"
  | "scope_violation_rejected";

export type OAuthMtAuditEntry = {
  id: string;
  tenantId: string;
  providerId: OAuthMtProviderId | null;
  action: OAuthMtAuditAction;
  at: string;
  detail: string;
};

export type OAuthMtConnectionSummary = {
  id: string;
  tenantId: string;
  providerId: OAuthMtProviderId;
  scopes: string[];
  accountId: string;
  accountName: string;
  status: OAuthMtConnectionStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type OAuthMtConnectionRecord = OAuthMtConnectionSummary & {
  encryptedAccessToken: string;
  encryptedRefreshToken: string | null;
};

type PendingAuthorization = {
  tenantId: string;
  providerId: OAuthMtProviderId;
  scopes: string[];
  codeChallenge: string;
  createdAt: number;
  /** Set only when reconnecting an existing (revoked) connection instead of creating a new one. */
  reconnectConnectionId?: string;
};

export class OAuthMtError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "OAuthMtError";
    this.code = code;
  }
}

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}

/** Fail-closed: throws outside test runtime unless a real key is configured. */
function resolveEncryptionKeyHex(): string {
  const configured = process.env.NELVYON_OAUTH_MT_ENCRYPTION_KEY?.trim();
  if (configured) return configured;
  if (isTestRuntime()) return TEST_ONLY_KEY_HEX;
  throw new OAuthMtError(
    "MISSING_ENCRYPTION_KEY",
    "NELVYON_OAUTH_MT_ENCRYPTION_KEY is required outside test runtime (fail-closed)",
  );
}

function keyBuffer(): Buffer {
  const hex = resolveEncryptionKeyHex();
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new OAuthMtError("INVALID_ENCRYPTION_KEY", "encryption key must be 32 bytes (64 hex chars)");
  }
  return buf;
}

export interface OAuthTokenVault {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}

/** AES-256-GCM vault — same `iv:authTag:cipher` hex format as `backend/oauth/OAuthService.ts`. */
export class AesGcmOAuthTokenVault implements OAuthTokenVault {
  encrypt(text: string): string {
    const key = keyBuffer();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  decrypt(encrypted: string): string {
    const key = keyBuffer();
    const [ivHex, authTagHex, encHex] = encrypted.split(":");
    if (!ivHex || !authTagHex || !encHex) {
      throw new OAuthMtError("INVALID_TOKEN_FORMAT", "invalid encrypted token format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(encHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type PkcePair = { codeVerifier: string; codeChallenge: string; method: "S256" };

export function generatePkce(): PkcePair {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge, method: "S256" };
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const expected = base64url(createHash("sha256").update(codeVerifier).digest());
  return expected === codeChallenge;
}

/** Minimum scopes per provider — connections must always request at least these. */
export const OAUTH_MT_MIN_SCOPES: Record<OAuthMtProviderId, readonly string[]> = {
  google: ["openid", "email"],
  meta: ["public_profile"],
  linkedin: ["r_liteprofile"],
  twilio: ["account_read"],
};

export function minimalScopesFor(providerId: OAuthMtProviderId): string[] {
  return [...OAUTH_MT_MIN_SCOPES[providerId]];
}

export function assertScopesIncludeMinimum(
  providerId: OAuthMtProviderId,
  scopes: readonly string[],
): { ok: boolean; missing: string[] } {
  const missing = OAUTH_MT_MIN_SCOPES[providerId].filter((s) => !scopes.includes(s));
  return { ok: missing.length === 0, missing };
}

type MockTokenPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  accountId: string;
  accountName: string;
};

/** Mock adapter contract — no implementation here ever performs network I/O. */
export interface MockOAuthProviderAdapter {
  readonly providerId: OAuthMtProviderId;
  mockExchangeCode(input: { code: string }): MockTokenPayload;
  mockRefresh(refreshToken: string): { accessToken: string; expiresAt: string };
}

function syntheticTokenPayload(providerId: OAuthMtProviderId, code: string): MockTokenPayload {
  const id = randomUUID();
  return {
    accessToken: `mock-${providerId}-access-${id}`,
    refreshToken: `mock-${providerId}-refresh-${id}`,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    accountId: `mock-${providerId}-account-${code.slice(0, 8)}`,
    accountName: `Mock ${providerId} account`,
  };
}

class GenericMockOAuthProvider implements MockOAuthProviderAdapter {
  constructor(readonly providerId: OAuthMtProviderId) {}

  mockExchangeCode(input: { code: string }): MockTokenPayload {
    return syntheticTokenPayload(this.providerId, input.code);
  }

  mockRefresh(refreshToken: string): { accessToken: string; expiresAt: string } {
    return {
      accessToken: `mock-${this.providerId}-access-${randomUUID()}-rotated-from-${refreshToken.slice(-6)}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  }
}

export const GoogleMockOAuthProvider = new GenericMockOAuthProvider("google");
export const MetaMockOAuthProvider = new GenericMockOAuthProvider("meta");
export const LinkedInMockOAuthProvider = new GenericMockOAuthProvider("linkedin");
export const TwilioMockOAuthProvider = new GenericMockOAuthProvider("twilio");

const MOCK_PROVIDERS: Record<OAuthMtProviderId, MockOAuthProviderAdapter> = {
  google: GoogleMockOAuthProvider,
  meta: MetaMockOAuthProvider,
  linkedin: LinkedInMockOAuthProvider,
  twilio: TwilioMockOAuthProvider,
};

export type StartAuthorizationResult = {
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  /**
   * Returned once so the caller (e.g. a Next.js API route) can persist it in an
   * httpOnly cookie until the callback. The framework itself never stores the
   * verifier server-side — only the resulting `codeChallenge` is kept alongside
   * the pending `state`, so a stolen `state` alone can never complete the flow.
   */
  codeVerifier: string;
};

/**
 * Tenant-scoped OAuth connection manager. All state is in-memory (per instance),
 * making it safe to unit test and reset without touching a real database.
 */
export class OAuthMultiTenantFramework {
  private readonly vault: OAuthTokenVault;
  private readonly connectionsByTenant = new Map<string, Map<string, OAuthMtConnectionRecord>>();
  private readonly pendingByState = new Map<string, PendingAuthorization>();
  private readonly auditLog: OAuthMtAuditEntry[] = [];

  constructor(vault: OAuthTokenVault = new AesGcmOAuthTokenVault()) {
    this.vault = vault;
  }

  private audit(entry: Omit<OAuthMtAuditEntry, "id" | "at">): void {
    this.auditLog.push({ ...entry, id: randomUUID(), at: new Date().toISOString() });
  }

  listAuditLog(tenantId?: string): readonly OAuthMtAuditEntry[] {
    return tenantId ? this.auditLog.filter((e) => e.tenantId === tenantId) : this.auditLog;
  }

  private tenantConnections(tenantId: string): Map<string, OAuthMtConnectionRecord> {
    if (!tenantId) throw new OAuthMtError("TENANT_REQUIRED", "tenantId is required");
    let map = this.connectionsByTenant.get(tenantId);
    if (!map) {
      map = new Map();
      this.connectionsByTenant.set(tenantId, map);
    }
    return map;
  }

  private toSummary(record: OAuthMtConnectionRecord): OAuthMtConnectionSummary {
    const { encryptedAccessToken: _a, encryptedRefreshToken: _r, ...summary } = record;
    return summary;
  }

  /** Step 1: begin authorization — generates CSRF state + PKCE challenge, enforces min scopes. */
  startAuthorization(input: {
    tenantId: string;
    providerId: OAuthMtProviderId;
    scopes: string[];
  }): StartAuthorizationResult {
    if (!input.tenantId) throw new OAuthMtError("TENANT_REQUIRED", "tenantId is required");
    const scopeCheck = assertScopesIncludeMinimum(input.providerId, input.scopes);
    if (!scopeCheck.ok) {
      this.audit({
        tenantId: input.tenantId,
        providerId: input.providerId,
        action: "scope_violation_rejected",
        detail: `missing=${scopeCheck.missing.join(",")}`,
      });
      throw new OAuthMtError("SCOPES_BELOW_MINIMUM", `missing required scopes: ${scopeCheck.missing.join(", ")}`);
    }

    const pkce = generatePkce();
    const state = `${randomUUID()}.${base64url(randomBytes(12))}`;
    this.pendingByState.set(state, {
      tenantId: input.tenantId,
      providerId: input.providerId,
      scopes: [...input.scopes],
      codeChallenge: pkce.codeChallenge,
      createdAt: Date.now(),
    });
    this.audit({
      tenantId: input.tenantId,
      providerId: input.providerId,
      action: "authorization_started",
      detail: `state=${state} scopes=${input.scopes.join(",")}`,
    });
    return { state, codeChallenge: pkce.codeChallenge, codeChallengeMethod: "S256", codeVerifier: pkce.codeVerifier };
  }

  /** Step 2: exchange the authorization code for tokens; verifies CSRF state + PKCE. */
  completeAuthorization(input: {
    state: string;
    code: string;
    codeVerifier: string;
  }): OAuthMtConnectionSummary {
    const pending = this.pendingByState.get(input.state);
    if (!pending) {
      this.audit({ tenantId: "unknown", providerId: null, action: "state_rejected", detail: "state_not_found" });
      throw new OAuthMtError("INVALID_STATE", "unknown or already-consumed state");
    }
    // One-time use, regardless of outcome below.
    this.pendingByState.delete(input.state);

    if (Date.now() - pending.createdAt > STATE_TTL_MS) {
      this.audit({ tenantId: pending.tenantId, providerId: pending.providerId, action: "state_rejected", detail: "state_expired" });
      throw new OAuthMtError("STATE_EXPIRED", "authorization state expired");
    }
    if (!verifyPkce(input.codeVerifier, pending.codeChallenge)) {
      this.audit({ tenantId: pending.tenantId, providerId: pending.providerId, action: "pkce_rejected", detail: "verifier_mismatch" });
      throw new OAuthMtError("PKCE_MISMATCH", "code_verifier does not match code_challenge");
    }

    const adapter = MOCK_PROVIDERS[pending.providerId];
    const token = adapter.mockExchangeCode({ code: input.code });

    const now = new Date().toISOString();
    const map = this.tenantConnections(pending.tenantId);

    if (pending.reconnectConnectionId) {
      const existing = map.get(pending.reconnectConnectionId);
      if (!existing) throw new OAuthMtError("NOT_FOUND", "connection to reconnect not found");
      existing.scopes = pending.scopes;
      existing.accountId = token.accountId;
      existing.accountName = token.accountName;
      existing.encryptedAccessToken = this.vault.encrypt(token.accessToken);
      existing.encryptedRefreshToken = this.vault.encrypt(token.refreshToken);
      existing.expiresAt = token.expiresAt;
      existing.status = "connected";
      existing.updatedAt = now;
      this.audit({
        tenantId: pending.tenantId,
        providerId: pending.providerId,
        action: "connection_reconnected",
        detail: `connection=${existing.id}`,
      });
      return this.toSummary(existing);
    }

    const record: OAuthMtConnectionRecord = {
      id: randomUUID(),
      tenantId: pending.tenantId,
      providerId: pending.providerId,
      scopes: pending.scopes,
      accountId: token.accountId,
      accountName: token.accountName,
      encryptedAccessToken: this.vault.encrypt(token.accessToken),
      encryptedRefreshToken: this.vault.encrypt(token.refreshToken),
      status: "connected",
      expiresAt: token.expiresAt,
      createdAt: now,
      updatedAt: now,
    };
    map.set(record.id, record);
    this.audit({
      tenantId: pending.tenantId,
      providerId: pending.providerId,
      action: "authorization_completed",
      detail: `connection=${record.id}`,
    });
    return this.toSummary(record);
  }

  private getOwnedConnection(tenantId: string, connectionId: string): OAuthMtConnectionRecord {
    const record = this.tenantConnections(tenantId).get(connectionId);
    if (!record) throw new OAuthMtError("NOT_FOUND", `connection not found: ${connectionId}`);
    if (record.tenantId !== tenantId) {
      throw new OAuthMtError("TENANT_MISMATCH", "cross-tenant access to connection denied");
    }
    return record;
  }

  listConnections(tenantId: string): OAuthMtConnectionSummary[] {
    return [...this.tenantConnections(tenantId).values()].map((r) => this.toSummary(r));
  }

  getConnection(tenantId: string, connectionId: string): OAuthMtConnectionSummary | null {
    try {
      return this.toSummary(this.getOwnedConnection(tenantId, connectionId));
    } catch {
      return null;
    }
  }

  /** Reveals a decrypted access token — intended for internal call sites only (never logged). */
  getDecryptedAccessToken(tenantId: string, connectionId: string): string {
    const record = this.getOwnedConnection(tenantId, connectionId);
    if (record.status !== "connected") throw new OAuthMtError("NOT_CONNECTED", `connection status=${record.status}`);
    return this.vault.decrypt(record.encryptedAccessToken);
  }

  /** Rotates the access token using the stored (encrypted) refresh token via the mock adapter. */
  rotateConnection(input: { tenantId: string; connectionId: string }): OAuthMtConnectionSummary {
    const record = this.getOwnedConnection(input.tenantId, input.connectionId);
    if (record.status !== "connected") {
      throw new OAuthMtError("NOT_CONNECTED", `cannot rotate a connection with status=${record.status}`);
    }
    if (!record.encryptedRefreshToken) {
      throw new OAuthMtError("NO_REFRESH_TOKEN", "connection has no refresh token to rotate with");
    }
    const refreshToken = this.vault.decrypt(record.encryptedRefreshToken);
    const adapter = MOCK_PROVIDERS[record.providerId];
    const rotated = adapter.mockRefresh(refreshToken);
    record.encryptedAccessToken = this.vault.encrypt(rotated.accessToken);
    record.expiresAt = rotated.expiresAt;
    record.updatedAt = new Date().toISOString();
    this.audit({
      tenantId: input.tenantId,
      providerId: record.providerId,
      action: "token_rotated",
      detail: `connection=${record.id}`,
    });
    return this.toSummary(record);
  }

  /** Revokes a connection: status → revoked, tokens wiped (kept encrypted-empty, not deleted). */
  revokeConnection(input: { tenantId: string; connectionId: string }): OAuthMtConnectionSummary {
    const record = this.getOwnedConnection(input.tenantId, input.connectionId);
    record.status = "revoked";
    record.encryptedAccessToken = "";
    record.encryptedRefreshToken = null;
    record.updatedAt = new Date().toISOString();
    this.audit({
      tenantId: input.tenantId,
      providerId: record.providerId,
      action: "connection_revoked",
      detail: `connection=${record.id}`,
    });
    return this.toSummary(record);
  }

  /** Starts a fresh authorization flow that will replace tokens on a previously revoked connection. */
  startReconnect(input: { tenantId: string; connectionId: string }): StartAuthorizationResult {
    const record = this.getOwnedConnection(input.tenantId, input.connectionId);
    if (record.status !== "revoked" && record.status !== "expired") {
      throw new OAuthMtError("INVALID_STATE", `cannot reconnect a connection with status=${record.status}`);
    }
    const pkce = generatePkce();
    const state = `${randomUUID()}.${base64url(randomBytes(12))}`;
    this.pendingByState.set(state, {
      tenantId: input.tenantId,
      providerId: record.providerId,
      scopes: record.scopes,
      codeChallenge: pkce.codeChallenge,
      createdAt: Date.now(),
      reconnectConnectionId: record.id,
    });
    return { state, codeChallenge: pkce.codeChallenge, codeChallengeMethod: "S256", codeVerifier: pkce.codeVerifier };
  }

  /** Hard delete — permanently removes the connection record from this tenant. */
  deleteConnection(input: { tenantId: string; connectionId: string }): void {
    const record = this.getOwnedConnection(input.tenantId, input.connectionId);
    this.tenantConnections(input.tenantId).delete(record.id);
    this.audit({
      tenantId: input.tenantId,
      providerId: record.providerId,
      action: "connection_deleted",
      detail: `connection=${record.id}`,
    });
  }
}

let sharedInstance: OAuthMultiTenantFramework | undefined;

export function getOAuthMultiTenantFramework(): OAuthMultiTenantFramework {
  if (!sharedInstance) sharedInstance = new OAuthMultiTenantFramework();
  return sharedInstance;
}

export function resetOAuthMultiTenantFrameworkForTests(): void {
  sharedInstance = new OAuthMultiTenantFramework();
}

export function assertOAuthMultiTenantFrameworkIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  const vault = new AesGcmOAuthTokenVault();
  const roundTrip = vault.decrypt(vault.encrypt("integrity-check-secret"));
  if (roundTrip !== "integrity-check-secret") violations.push("vault_round_trip_failed");

  for (const providerId of Object.keys(OAUTH_MT_MIN_SCOPES) as OAuthMtProviderId[]) {
    if (OAUTH_MT_MIN_SCOPES[providerId].length === 0) {
      violations.push(`min_scopes_empty:${providerId}`);
    }
  }

  const pkce = generatePkce();
  if (!verifyPkce(pkce.codeVerifier, pkce.codeChallenge)) violations.push("pkce_self_check_failed");
  if (verifyPkce("wrong-verifier", pkce.codeChallenge)) violations.push("pkce_must_reject_wrong_verifier");

  const framework = new OAuthMultiTenantFramework();
  const mismatchAuth = framework.startAuthorization({
    tenantId: "integrity-tenant-a",
    providerId: "google",
    scopes: [...OAUTH_MT_MIN_SCOPES.google],
  });
  const pkce2 = generatePkce();
  // Force mismatch on purpose to prove PKCE is enforced end-to-end.
  try {
    framework.completeAuthorization({ state: mismatchAuth.state, code: "code-1", codeVerifier: pkce2.codeVerifier });
    violations.push("pkce_mismatch_must_reject_completion");
  } catch (err) {
    if (!(err instanceof OAuthMtError) || err.code !== "PKCE_MISMATCH") violations.push("pkce_mismatch_wrong_error");
  }

  const okAuth = framework.startAuthorization({
    tenantId: "integrity-tenant-a",
    providerId: "google",
    scopes: [...OAUTH_MT_MIN_SCOPES.google],
  });
  const okConn = framework.completeAuthorization({
    state: okAuth.state,
    code: "code-2",
    codeVerifier: okAuth.codeVerifier,
  });
  if (okConn.status !== "connected") violations.push("valid_pkce_flow_must_connect");

  const conns = framework.listConnections("integrity-tenant-b");
  if (conns.length !== 0) violations.push("tenant_isolation_leak");

  return { ok: violations.length === 0, violations };
}
