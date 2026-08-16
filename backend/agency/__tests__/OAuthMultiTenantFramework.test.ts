import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AesGcmOAuthTokenVault,
  OAUTH_MT_MIN_SCOPES,
  OAuthMtError,
  OAuthMultiTenantFramework,
  type OAuthMtConnectionSummary,
  assertOAuthMultiTenantFrameworkIntegrity,
  assertScopesIncludeMinimum,
  generatePkce,
  getOAuthMultiTenantFramework,
  minimalScopesFor,
  resetOAuthMultiTenantFrameworkForTests,
  verifyPkce,
} from "../OAuthMultiTenantFramework";

describe("OAuthMultiTenantFramework — token vault (AES-256-GCM)", () => {
  // Capturado DENTRO del hook: `process.env` es del proceso y vitest aisla
  // modulos, no procesos, asi que un valor congelado al cargar el modulo seria
  // el que dejo otro fichero del mismo worker.
  let savedKey: typeof process.env.NELVYON_OAUTH_MT_ENCRYPTION_KEY;
  let savedNodeEnv: typeof process.env.NODE_ENV;
  let savedVitest: typeof process.env.VITEST;

  beforeEach(() => {
    savedKey = process.env.NELVYON_OAUTH_MT_ENCRYPTION_KEY;
    savedNodeEnv = process.env.NODE_ENV;
    savedVitest = process.env.VITEST;
  });

  afterEach(() => {
    if (savedKey !== undefined) process.env.NELVYON_OAUTH_MT_ENCRYPTION_KEY = savedKey;
    else delete process.env.NELVYON_OAUTH_MT_ENCRYPTION_KEY;
    process.env.NODE_ENV = savedNodeEnv;
    process.env.VITEST = savedVitest;
  });

  it("round-trips plaintext through encrypt/decrypt", () => {
    const vault = new AesGcmOAuthTokenVault();
    const enc = vault.encrypt("super-secret-token");
    expect(enc).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i);
    expect(vault.decrypt(enc)).toBe("super-secret-token");
  });

  it("fails closed outside test runtime without a configured key", () => {
    delete process.env.NELVYON_OAUTH_MT_ENCRYPTION_KEY;
    process.env.NODE_ENV = "production";
    process.env.VITEST = undefined;
    const vault = new AesGcmOAuthTokenVault();
    expect(() => vault.encrypt("x")).toThrow(OAuthMtError);
  });

  it("uses a configured key when present, even outside test runtime", () => {
    process.env.NODE_ENV = "production";
    process.env.VITEST = undefined;
    process.env.NELVYON_OAUTH_MT_ENCRYPTION_KEY = "cd".repeat(32);
    const vault = new AesGcmOAuthTokenVault();
    expect(vault.decrypt(vault.encrypt("prod-secret"))).toBe("prod-secret");
  });
});

describe("OAuthMultiTenantFramework — PKCE + scopes", () => {
  it("PKCE verify accepts the matching verifier and rejects a wrong one", () => {
    const pkce = generatePkce();
    expect(verifyPkce(pkce.codeVerifier, pkce.codeChallenge)).toBe(true);
    expect(verifyPkce("wrong", pkce.codeChallenge)).toBe(false);
  });

  it("minimum scopes are declared for every provider and enforced", () => {
    for (const providerId of Object.keys(OAUTH_MT_MIN_SCOPES) as Array<keyof typeof OAUTH_MT_MIN_SCOPES>) {
      expect(minimalScopesFor(providerId).length).toBeGreaterThan(0);
    }
    expect(assertScopesIncludeMinimum("google", ["openid", "email", "extra"]).ok).toBe(true);
    const missing = assertScopesIncludeMinimum("google", ["openid"]);
    expect(missing.ok).toBe(false);
    expect(missing.missing).toContain("email");
  });
});

describe("OAuthMultiTenantFramework — full connection lifecycle", () => {
  let framework: OAuthMultiTenantFramework;

  beforeEach(() => {
    framework = new OAuthMultiTenantFramework();
  });

  function completeGoogleAuthorization(tenantId: string): OAuthMtConnectionSummary {
    const start = framework.startAuthorization({
      tenantId,
      providerId: "google",
      scopes: [...OAUTH_MT_MIN_SCOPES.google],
    });
    return framework.completeAuthorization({
      state: start.state,
      code: `auth-code-${tenantId}`,
      codeVerifier: start.codeVerifier,
    });
  }

  it("rejects starting authorization below minimum scopes", () => {
    expect(() =>
      framework.startAuthorization({ tenantId: "tenant-a", providerId: "google", scopes: [] }),
    ).toThrow(/SCOPES_BELOW_MINIMUM|missing required scopes/);
  });

  it("completes authorization end-to-end with matching PKCE + state, creating a tenant-scoped connection", () => {
    const conn = completeGoogleAuthorization("tenant-a");
    expect(conn.status).toBe("connected");
    expect(conn.tenantId).toBe("tenant-a");
    expect(conn.providerId).toBe("google");
    expect(conn.scopes).toEqual(OAUTH_MT_MIN_SCOPES.google);
  });

  it("rejects completion with a mismatched code_verifier (PKCE enforced)", () => {
    const start = framework.startAuthorization({
      tenantId: "tenant-a",
      providerId: "google",
      scopes: [...OAUTH_MT_MIN_SCOPES.google],
    });
    const otherPkce = generatePkce();
    expect(() =>
      framework.completeAuthorization({
        state: start.state,
        code: "auth-code-1",
        codeVerifier: otherPkce.codeVerifier,
      }),
    ).toThrow(/PKCE_MISMATCH/);
  });

  it("revoke -> reconnect -> rotate -> delete full lifecycle", () => {
    const conn = completeGoogleAuthorization("tenant-a");
    expect(conn.status).toBe("connected");

    const rotated = framework.rotateConnection({ tenantId: "tenant-a", connectionId: conn.id });
    expect(rotated.status).toBe("connected");

    const revoked = framework.revokeConnection({ tenantId: "tenant-a", connectionId: conn.id });
    expect(revoked.status).toBe("revoked");
    expect(() => framework.rotateConnection({ tenantId: "tenant-a", connectionId: conn.id })).toThrow(
      /NOT_CONNECTED/,
    );

    const reconnectStart = framework.startReconnect({ tenantId: "tenant-a", connectionId: conn.id });
    expect(reconnectStart.state).toBeTruthy();
    const reconnected = framework.completeAuthorization({
      state: reconnectStart.state,
      code: "auth-code-reconnect",
      codeVerifier: reconnectStart.codeVerifier,
    });
    expect(reconnected.status).toBe("connected");
    expect(reconnected.id).toBe(conn.id);

    framework.deleteConnection({ tenantId: "tenant-a", connectionId: conn.id });
    expect(framework.getConnection("tenant-a", conn.id)).toBeNull();
  });

  it("cannot reconnect a still-connected connection", () => {
    const conn = completeGoogleAuthorization("tenant-a");
    expect(() => framework.startReconnect({ tenantId: "tenant-a", connectionId: conn.id })).toThrow(
      /INVALID_STATE/,
    );
  });

  it("tenant isolation: tenant B cannot see or touch tenant A's connections", () => {
    const connA = completeGoogleAuthorization("tenant-a");
    expect(framework.listConnections("tenant-b")).toEqual([]);
    expect(() => framework.rotateConnection({ tenantId: "tenant-b", connectionId: connA.id })).toThrow(
      OAuthMtError,
    );
    expect(framework.getConnection("tenant-b", connA.id)).toBeNull();
  });

  it("state is single-use — a second completion attempt with the same state is rejected", () => {
    const start = framework.startAuthorization({
      tenantId: "tenant-a",
      providerId: "meta",
      scopes: [...OAUTH_MT_MIN_SCOPES.meta],
    });
    framework.completeAuthorization({ state: start.state, code: "c", codeVerifier: start.codeVerifier });
    expect(() =>
      framework.completeAuthorization({ state: start.state, code: "c", codeVerifier: start.codeVerifier }),
    ).toThrow(/INVALID_STATE/);
  });

  it("rejects an unknown state outright", () => {
    expect(() =>
      framework.completeAuthorization({ state: "not-a-real-state", code: "c", codeVerifier: "v" }),
    ).toThrow(/INVALID_STATE/);
  });

  it("audit log records lifecycle events per tenant", () => {
    const conn = completeGoogleAuthorization("tenant-a");
    framework.rotateConnection({ tenantId: "tenant-a", connectionId: conn.id });
    framework.revokeConnection({ tenantId: "tenant-a", connectionId: conn.id });
    const log = framework.listAuditLog("tenant-a");
    const actions = log.map((e) => e.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "authorization_started",
        "authorization_completed",
        "token_rotated",
        "connection_revoked",
      ]),
    );
  });

  it("connection summaries never expose raw or encrypted tokens", () => {
    const conn = completeGoogleAuthorization("tenant-a");
    expect(conn).not.toHaveProperty("encryptedAccessToken");
    expect(conn).not.toHaveProperty("encryptedRefreshToken");
    expect(conn).not.toHaveProperty("accessToken");
  });

  it("getDecryptedAccessToken works only for the owning tenant and connected status", () => {
    const conn = completeGoogleAuthorization("tenant-a");
    const token = framework.getDecryptedAccessToken("tenant-a", conn.id);
    expect(token).toMatch(/^mock-google-access-/);
    expect(() => framework.getDecryptedAccessToken("tenant-b", conn.id)).toThrow(OAuthMtError);
    framework.revokeConnection({ tenantId: "tenant-a", connectionId: conn.id });
    expect(() => framework.getDecryptedAccessToken("tenant-a", conn.id)).toThrow(/NOT_CONNECTED/);
  });
});

describe("OAuthMultiTenantFramework — shared singleton + integrity", () => {
  afterEach(() => {
    resetOAuthMultiTenantFrameworkForTests();
  });

  it("shared instance persists and can be reset for tests", () => {
    const a = getOAuthMultiTenantFramework();
    const start = a.startAuthorization({
      tenantId: "tenant-a",
      providerId: "linkedin",
      scopes: [...OAUTH_MT_MIN_SCOPES.linkedin],
    });
    const conn = a.completeAuthorization({ state: start.state, code: "c", codeVerifier: start.codeVerifier });
    const b = getOAuthMultiTenantFramework();
    expect(b.getConnection("tenant-a", conn.id)?.id).toBe(conn.id);

    resetOAuthMultiTenantFrameworkForTests();
    const c = getOAuthMultiTenantFramework();
    expect(c.getConnection("tenant-a", conn.id)).toBeNull();
  });

  it("passes full integrity assertion", () => {
    expect(assertOAuthMultiTenantFrameworkIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
