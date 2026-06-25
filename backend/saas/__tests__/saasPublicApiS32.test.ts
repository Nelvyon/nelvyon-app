/**
 * S32 — Public API v1: SaasApiKeysService + requirePublicApiContext
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";

import { SaasApiKeysService, resetSaasApiKeysServiceForTests } from "../SaasApiKeysService";
import {
  hasScope,
  checkPublicApiRateLimit,
  getRateLimitRemaining,
  resetRateLimitForTests,
} from "../requirePublicApiContext";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const TENANT = "tenant-s32-001";
const USER_ID = "00000000-0000-0000-0000-000000000001";

function now() { return new Date().toISOString(); }
function future(days = 30) { return new Date(Date.now() + days * 86400000).toISOString(); }
function past(days = 1)    { return new Date(Date.now() - days * 86400000).toISOString(); }

function sha256(s: string) { return crypto.createHash("sha256").update(s).digest("hex"); }

function makeKeyRow(rawKey: string, overrides: Record<string, unknown> = {}) {
  const keyHash   = sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 12);
  return {
    id: "key-uuid-1", tenant_id: TENANT, name: "Test Key",
    key_prefix: keyPrefix, key_hash: keyHash,
    scopes: ["crm.read", "pipeline.read"],
    active: true,
    expires_at: null,
    last_used_at: null,
    requests_total: 0,
    created_by: USER_ID,
    created_at: now(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("SaasApiKeysService", () => {
  let db: SaasPostgresPort;
  let svc: SaasApiKeysService;

  beforeEach(() => {
    resetSaasApiKeysServiceForTests();
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    svc = new SaasApiKeysService(db);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  it("lists keys for tenant", async () => {
    const rawKey = `nlv_${"a".repeat(48)}`;
    vi.mocked(db.query).mockResolvedValueOnce([makeKeyRow(rawKey)]);
    const keys = await svc.list(TENANT);
    expect(keys).toHaveLength(1);
    expect(keys[0]?.tenantId).toBe(TENANT);
    expect(keys[0]?.scopes).toEqual(["crm.read", "pipeline.read"]);
  });

  it("returns empty array for tenant with no keys", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    expect(await svc.list(TENANT)).toHaveLength(0);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it("creates key with valid scopes", async () => {
    const rawKey = `nlv_${"b".repeat(48)}`;
    vi.mocked(db.query).mockResolvedValueOnce([makeKeyRow(rawKey, { name: "Zapier" })]);
    const result = await svc.create(TENANT, USER_ID, { name: "Zapier", scopes: ["crm.read"] });
    expect(result.rawKey).toMatch(/^nlv_/);
    expect(result.key.name).toBe("Zapier");
  });

  it("rejects empty name", async () => {
    await expect(svc.create(TENANT, USER_ID, { name: "  " })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects invalid scope", async () => {
    await expect(svc.create(TENANT, USER_ID, { name: "bad", scopes: ["admin.superuser"] })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("accepts wildcard scope *", async () => {
    const rawKey = `nlv_${"c".repeat(48)}`;
    vi.mocked(db.query).mockResolvedValueOnce([makeKeyRow(rawKey, { scopes: ["*"] })]);
    const result = await svc.create(TENANT, USER_ID, { name: "Full Access", scopes: ["*"] });
    expect(result.key.scopes).toContain("*");
  });

  it("defaults to crm.read when no scopes provided", async () => {
    const rawKey = `nlv_${"d".repeat(48)}`;
    vi.mocked(db.query).mockResolvedValueOnce([makeKeyRow(rawKey, { scopes: ["crm.read"] })]);
    const result = await svc.create(TENANT, USER_ID, { name: "Default" });
    expect(result.rawKey).toMatch(/^nlv_/);
  });

  it("creates key with expiry date", async () => {
    const rawKey = `nlv_${"e".repeat(48)}`;
    const expiresAt = future(7);
    vi.mocked(db.query).mockResolvedValueOnce([makeKeyRow(rawKey, { expires_at: expiresAt })]);
    const result = await svc.create(TENANT, USER_ID, { name: "Temp", expiresAt });
    expect(result.key.expiresAt).not.toBeNull();
  });

  // ── revoke ────────────────────────────────────────────────────────────────

  it("revokes active key", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{ id: "key-uuid-1" }]);
    await expect(svc.revoke(TENANT, "key-uuid-1")).resolves.toBeUndefined();
  });

  it("throws NOT_FOUND when key not found or already revoked", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await expect(svc.revoke(TENANT, "ghost")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  // ── verifyKey ─────────────────────────────────────────────────────────────

  it("verifies valid key and returns tenantId + scopes", async () => {
    const rawKey = `nlv_${"f".repeat(48)}`;
    const keyHash = sha256(rawKey);
    vi.mocked(db.query)
      .mockResolvedValueOnce([{ tenant_id: TENANT, scopes: ["crm.read"], expires_at: null, key_hash: keyHash }])
      .mockResolvedValueOnce([]); // UPDATE last_used_at
    const result = await svc.verifyKey(rawKey);
    expect(result).not.toBeNull();
    expect(result?.tenantId).toBe(TENANT);
    expect(result?.scopes).toContain("crm.read");
  });

  it("returns null for key not found in DB", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    expect(await svc.verifyKey("bad-key-format")).toBeNull();
  });

  it("returns null for inactive/missing key", async () => {
    const rawKey = `nlv_${"g".repeat(48)}`;
    vi.mocked(db.query).mockResolvedValueOnce([]);
    expect(await svc.verifyKey(rawKey)).toBeNull();
  });

  it("returns null for expired key", async () => {
    const rawKey = `nlv_${"h".repeat(48)}`;
    vi.mocked(db.query).mockResolvedValueOnce([{
      tenant_id: TENANT, scopes: ["*"], expires_at: past(1),
    }]);
    expect(await svc.verifyKey(rawKey)).toBeNull();
  });

  it("accepts non-expired key", async () => {
    const rawKey = `nlv_${"i".repeat(48)}`;
    vi.mocked(db.query)
      .mockResolvedValueOnce([{ tenant_id: TENANT, scopes: ["crm.read"], expires_at: future(30) }])
      .mockResolvedValueOnce([]);
    expect(await svc.verifyKey(rawKey)).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("hasScope", () => {
  it("returns true when scope matches", () => {
    expect(hasScope(["crm.read", "pipeline.read"], "crm.read")).toBe(true);
  });

  it("returns false when scope is missing", () => {
    expect(hasScope(["crm.read"], "crm.write")).toBe(false);
  });

  it("wildcard * grants any scope", () => {
    expect(hasScope(["*"], "campaigns.read")).toBe(true);
    expect(hasScope(["*"], "pipeline.write")).toBe(true);
  });

  it("empty scopes denies everything", () => {
    expect(hasScope([], "crm.read")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("checkPublicApiRateLimit", () => {
  const KEY = "test-rate-key-001";

  beforeEach(() => { resetRateLimitForTests(); });

  it("allows first request", () => {
    expect(checkPublicApiRateLimit(KEY, 5)).toBe(true);
  });

  it("allows up to the limit", () => {
    for (let i = 0; i < 5; i++) checkPublicApiRateLimit(KEY, 5);
    expect(checkPublicApiRateLimit(KEY, 5)).toBe(false);
  });

  it("remaining decrements correctly", () => {
    checkPublicApiRateLimit(KEY, 10);
    checkPublicApiRateLimit(KEY, 10);
    expect(getRateLimitRemaining(KEY, 10)).toBe(8);
  });

  it("different keys have independent buckets", () => {
    for (let i = 0; i < 3; i++) checkPublicApiRateLimit("key-a", 3);
    expect(checkPublicApiRateLimit("key-a", 3)).toBe(false);
    expect(checkPublicApiRateLimit("key-b", 3)).toBe(true);
  });

  it("returns full remaining for unknown key", () => {
    expect(getRateLimitRemaining("never-seen", 60)).toBe(60);
  });
});
