/**
 * S33 — Enterprise SSO + Audit v2 + RBAC total
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  SaasSsoService,
  resetSaasSsoServiceForTests,
  SaasSsoError,
  encryptSecret,
  decryptSecret,
  buildOidcAuthUrl,
} from "../SaasSsoService";
import {
  SaasAuditService,
  resetSaasAuditServiceForTests,
  type AuditFilters,
} from "../SaasAuditService";
import {
  canSaasPerform,
  assertSaasPermission,
  SaasRbacError,
  listPermissionsForRole,
} from "../saasRbac";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const TENANT = "tenant-s33-001";

// ── Encryption key for tests ──────────────────────────────────────────────────
const TEST_ENC_KEY = "0".repeat(64); // 32 bytes hex

function withEncKey<T>(fn: () => T): T {
  const prev = process.env.SAAS_SSO_ENCRYPTION_KEY;
  process.env.SAAS_SSO_ENCRYPTION_KEY = TEST_ENC_KEY;
  try { return fn(); }
  finally { process.env.SAAS_SSO_ENCRYPTION_KEY = prev; }
}
async function withEncKeyAsync<T>(fn: () => Promise<T>): Promise<T> {
  const prev = process.env.SAAS_SSO_ENCRYPTION_KEY;
  process.env.SAAS_SSO_ENCRYPTION_KEY = TEST_ENC_KEY;
  try { return await fn(); }
  finally { process.env.SAAS_SSO_ENCRYPTION_KEY = prev; }
}

// ── SaasSsoService ────────────────────────────────────────────────────────────
describe("SaasSsoService", () => {
  let db: SaasPostgresPort;
  let svc: SaasSsoService;

  beforeEach(() => {
    resetSaasSsoServiceForTests();
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    svc = new SaasSsoService({ db });
  });

  // ── getConfig ──────────────────────────────────────────────────────────────
  it("returns null when no config exists", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    expect(await svc.getConfig(TENANT)).toBeNull();
  });

  it("returns config when found", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{
      id: "cfg-1", tenant_id: TENANT, provider: "oidc",
      issuer: "https://accounts.google.com", client_id: "cid",
      metadata_url: null, domains: ["empresa.com"],
      enforced: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]);
    const cfg = await svc.getConfig(TENANT);
    expect(cfg).not.toBeNull();
    expect(cfg?.provider).toBe("oidc");
    expect(cfg?.domains).toContain("empresa.com");
  });

  // ── upsertConfig ───────────────────────────────────────────────────────────
  it("throws VALIDATION for empty issuer", async () => {
    await withEncKeyAsync(() =>
      expect(svc.upsertConfig(TENANT, {
        provider: "oidc", issuer: "", clientId: "x", clientSecret: "s",
      })).rejects.toMatchObject({ code: "VALIDATION" }),
    );
  });

  it("throws VALIDATION for empty clientId", async () => {
    await withEncKeyAsync(() =>
      expect(svc.upsertConfig(TENANT, {
        provider: "oidc", issuer: "https://issuer.com", clientId: " ", clientSecret: "s",
      })).rejects.toMatchObject({ code: "VALIDATION" }),
    );
  });

  it("throws VALIDATION for empty clientSecret", async () => {
    await withEncKeyAsync(() =>
      expect(svc.upsertConfig(TENANT, {
        provider: "oidc", issuer: "https://issuer.com", clientId: "cid", clientSecret: "",
      })).rejects.toMatchObject({ code: "VALIDATION" }),
    );
  });

  it("throws VALIDATION for invalid provider", async () => {
    await withEncKeyAsync(() =>
      expect(svc.upsertConfig(TENANT, {
        provider: "ldap" as "oidc", issuer: "https://issuer.com", clientId: "cid", clientSecret: "sec",
      })).rejects.toMatchObject({ code: "VALIDATION" }),
    );
  });

  it("creates config and returns it", async () => {
    await withEncKeyAsync(async () => {
      vi.mocked(db.query).mockResolvedValueOnce([{
        id: "cfg-1", tenant_id: TENANT, provider: "oidc",
        issuer: "https://accounts.google.com", client_id: "my-client",
        metadata_url: null, domains: ["empresa.com"],
        enforced: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }]);
      const cfg = await svc.upsertConfig(TENANT, {
        provider: "oidc", issuer: "https://accounts.google.com",
        clientId: "my-client", clientSecret: "super-secret",
        domains: ["empresa.com"],
      });
      expect(cfg.clientId).toBe("my-client");
      expect(cfg.domains).toContain("empresa.com");
    });
  });

  // ── toggleEnforce ──────────────────────────────────────────────────────────
  it("throws NOT_FOUND when toggling non-existent config", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await expect(svc.toggleEnforce(TENANT, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("toggles enforced to true", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{
      id: "cfg-1", tenant_id: TENANT, provider: "oidc",
      issuer: "https://issuer.com", client_id: "cid", metadata_url: null,
      domains: [], enforced: true, created_at: "", updated_at: "",
    }]);
    const cfg = await svc.toggleEnforce(TENANT, true);
    expect(cfg.enforced).toBe(true);
  });

  // ── deleteConfig ───────────────────────────────────────────────────────────
  it("throws NOT_FOUND when deleting non-existent config", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await expect(svc.deleteConfig(TENANT)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes config without error", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{ id: "cfg-1" }]);
    await expect(svc.deleteConfig(TENANT)).resolves.toBeUndefined();
  });

  // ── getOrCreateIdentity ────────────────────────────────────────────────────
  it("returns existing identity when found", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{
      id: "id-1", tenant_id: TENANT, provider: "oidc",
      provider_sub: "sub-abc", user_id: "usr-1",
      email: "user@empresa.com", created_at: "",
    }]);
    const identity = await svc.getOrCreateIdentity({
      tenantId: TENANT, provider: "oidc", providerSub: "sub-abc",
    });
    expect(identity.userId).toBe("usr-1");
    expect(db.query).toHaveBeenCalledTimes(1); // no INSERT
  });

  it("creates new identity when not found (JIT provision)", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([]) // SELECT → not found
      .mockResolvedValueOnce([{ // INSERT → created
        id: "id-2", tenant_id: TENANT, provider: "oidc",
        provider_sub: "new-sub", user_id: "sso_abc123",
        email: "nuevo@empresa.com", created_at: "",
      }]);
    const identity = await svc.getOrCreateIdentity({
      tenantId: TENANT, provider: "oidc", providerSub: "new-sub",
      email: "nuevo@empresa.com",
    });
    expect(identity.userId).toMatch(/^sso_/);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  // ── resolveTenantByDomain ─────────────────────────────────────────────────
  it("returns null when domain not enforced", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    expect(await svc.resolveTenantByDomain("unknown.com")).toBeNull();
  });

  it("returns tenantId when domain is enforced", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{ tenant_id: TENANT }]);
    expect(await svc.resolveTenantByDomain("empresa.com")).toBe(TENANT);
  });
});

// ── Encryption ────────────────────────────────────────────────────────────────
describe("encryptSecret / decryptSecret", () => {
  it("round-trips the secret correctly", () => {
    withEncKey(() => {
      const plain = "super-client-secret-42";
      const enc   = encryptSecret(plain);
      expect(enc).not.toBe(plain);
      expect(decryptSecret(enc)).toBe(plain);
    });
  });

  it("throws CONFIG_ERROR when env key is missing", () => {
    const prev = process.env.SAAS_SSO_ENCRYPTION_KEY;
    delete process.env.SAAS_SSO_ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow();
    process.env.SAAS_SSO_ENCRYPTION_KEY = prev;
  });

  it("produces different ciphertext each call (random IV)", () => {
    withEncKey(() => {
      const a = encryptSecret("same");
      const b = encryptSecret("same");
      expect(a).not.toBe(b); // different IVs
    });
  });
});

// ── buildOidcAuthUrl ──────────────────────────────────────────────────────────
describe("buildOidcAuthUrl", () => {
  it("builds a valid authorization URL", () => {
    const url = buildOidcAuthUrl({
      issuer: "https://accounts.google.com",
      clientId: "my-client",
      redirectUri: "https://app.nelvyon.com/api/auth/sso/callback",
      state: "state-xyz",
      nonce: "nonce-abc",
    });
    expect(url).toContain("accounts.google.com/authorize");
    expect(url).toContain("client_id=my-client");
    expect(url).toContain("response_type=code");
    expect(url).toContain("state=state-xyz");
  });
});

// ── SaasAuditService v2 ───────────────────────────────────────────────────────
describe("SaasAuditService v2", () => {
  let db: SaasPostgresPort;
  let svc: SaasAuditService;

  beforeEach(() => {
    resetSaasAuditServiceForTests();
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    svc = new SaasAuditService({ db });
  });

  afterEach(() => { resetSaasAuditServiceForTests(); });

  it("getTotal returns count from DB", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{ count: "42" }]);
    expect(await svc.getTotal(TENANT)).toBe(42);
  });

  it("getTotal with filters builds correct query", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{ count: "5" }]);
    const total = await svc.getTotal(TENANT, { module: "crm", action: "create" });
    expect(total).toBe(5);
    const sql = vi.mocked(db.query).mock.calls[0]![0] as string;
    expect(sql).toContain("COUNT(*)");
  });

  it("exportCsv returns CSV string with header row", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{
      id: "1", tenantId: TENANT, userId: "u1", userEmail: "a@b.com",
      action: "create", module: "crm", resourceId: "res-1",
      resourceType: "contact", ipAddress: "1.2.3.4",
      createdAt: "2026-01-01T12:00:00Z", details: {}, userAgent: null,
    }]);
    const csv = await svc.exportCsv(TENANT);
    expect(csv.split("\n")[0]).toContain("id,tenant_id");
    expect(csv).toContain("a@b.com");
  });

  it("exportCsv escapes double quotes in fields", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{
      id: "2", tenantId: TENANT, userId: null, userEmail: 'with"quote',
      action: "create", module: "test", resourceId: null,
      resourceType: null, ipAddress: null,
      createdAt: "2026-01-01T12:00:00Z", details: {}, userAgent: null,
    }]);
    const csv = await svc.exportCsv(TENANT);
    expect(csv).toContain('with""quote');
  });

  it("purgeOlderThan returns number deleted", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{ count: "15" }]);
    expect(await svc.purgeOlderThan(TENANT, 90)).toBe(15);
  });

  it("purgeOlderThan throws for days < 1", async () => {
    await expect(svc.purgeOlderThan(TENANT, 0)).rejects.toThrow("days must be >= 1");
  });

  it("log inserts correctly", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await svc.log(TENANT, { action: "create", module: "crm", userEmail: "x@y.com" });
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

// ── RBAC total ────────────────────────────────────────────────────────────────
describe("RBAC — SSO + audit permissions", () => {
  it("owner has sso.write", () => {
    expect(canSaasPerform("owner", "sso.write")).toBe(true);
  });

  it("admin has sso.write", () => {
    expect(canSaasPerform("admin", "sso.write")).toBe(true);
  });

  it("member does NOT have sso.write", () => {
    expect(canSaasPerform("member", "sso.write")).toBe(false);
  });

  it("viewer does NOT have sso.write", () => {
    expect(canSaasPerform("viewer", "sso.write")).toBe(false);
  });

  it("owner has audit.read", () => {
    expect(canSaasPerform("owner", "audit.read")).toBe(true);
  });

  it("admin has audit.read", () => {
    expect(canSaasPerform("admin", "audit.read")).toBe(true);
  });

  it("member does NOT have audit.read", () => {
    expect(canSaasPerform("member", "audit.read")).toBe(false);
  });

  it("viewer does NOT have audit.read", () => {
    expect(canSaasPerform("viewer", "audit.read")).toBe(false);
  });

  it("owner has settings.write", () => {
    expect(canSaasPerform("owner", "settings.write")).toBe(true);
  });

  it("admin does NOT have settings.write", () => {
    expect(canSaasPerform("admin", "settings.write")).toBe(false);
  });

  it("assertSaasPermission throws FORBIDDEN for member on sso.write", () => {
    expect(() => assertSaasPermission("member", "sso.write"))
      .toThrow(SaasRbacError);
  });

  it("listPermissionsForRole owner includes all new SSO+audit perms", () => {
    const perms = listPermissionsForRole("owner");
    expect(perms).toContain("sso.read");
    expect(perms).toContain("sso.write");
    expect(perms).toContain("audit.read");
    expect(perms).toContain("settings.write");
  });

  it("viewer has sso.read (can see SSO status)", () => {
    expect(canSaasPerform("viewer", "sso.read")).toBe(true);
  });
});
