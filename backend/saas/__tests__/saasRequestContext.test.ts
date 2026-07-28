import { describe, expect, it, beforeEach, vi } from "vitest";
import { isPgMissingRelation, saasErrorBody, saasErrorStatus } from "../saasRequestContext";
import { SaasRbacError } from "../saasRbac";

vi.mock("@nelvyon/auth", () => ({
  authenticate: vi.fn(async () => ({ userId: "user-1" })),
}));

vi.mock("../SaasOnboardingService", () => ({
  getSaasOnboardingService: () => ({
    getTenant: vi.fn(async () => ({
      id: "tenant-1",
      workspaceId: 1,
      companyName: "Acme",
      plan: "starter",
      onboardingCompleted: true,
    })),
  }),
}));

const getCustomPermissions = vi.fn();
const getIpAllowlist = vi.fn();
const assertIpAllowed = vi.fn();

vi.mock("../SaasSecurityEnterpriseService", () => ({
  getSaasSecurityEnterpriseService: () => ({
    getCustomPermissions,
    getIpAllowlist,
    assertIpAllowed,
  }),
  SaasSecurityEnterpriseError: class SaasSecurityEnterpriseError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
  extractClientIp: () => "203.0.113.10",
}));

vi.mock("../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({
      query: vi.fn(async () => []),
    }),
  },
}));

import {
  requireSaasContext,
  SaasControlPlaneError,
  requestIdFrom,
} from "../saasRequestContext";
import { SaasSecurityEnterpriseError } from "../SaasSecurityEnterpriseService";
import {
  claimWebhookInIdempotency,
  resetWebhookInIdempotencyForTests,
} from "../webhookInIdempotency";

describe("isPgMissingRelation", () => {
  it("detects postgres missing relation code", () => {
    expect(isPgMissingRelation({ code: "42P01" })).toBe(true);
    expect(isPgMissingRelation(new Error('relation "x" does not exist'))).toBe(true);
    expect(isPgMissingRelation(new Error("other"))).toBe(false);
  });
});

describe("saasErrorBody", () => {
  it("maps missing relation to SCHEMA_MISMATCH without leaking table names", () => {
    expect(saasErrorBody(new Error('relation "secret_table" does not exist'))).toEqual({
      error: "Database schema incomplete — apply pending migrations",
      code: "SCHEMA_MISMATCH",
    });
    expect(saasErrorStatus({ code: "42P01" })).toBe(503);
  });

  it("keeps opaque Internal error for unknown driver failures", () => {
    expect(saasErrorBody(new Error("ECONNRESET mysterious socket"))).toEqual({
      error: "Internal error",
    });
    expect(saasErrorStatus(new Error("ECONNRESET mysterious socket"))).toBe(500);
  });

  it("preserves SaasRbacError messages", () => {
    expect(saasErrorBody(new SaasRbacError("Forbidden", "FORBIDDEN"))).toEqual({
      error: "Forbidden",
      code: "FORBIDDEN",
    });
  });

  it("surfaces PRIVATE_AI_CANARY_BLOCKED as 403 with code (not opaque 500)", () => {
    const err = new Error(
      "PRIVATE_AI_CANARY_BLOCKED: set NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=1 for the canary window",
    );
    expect(saasErrorStatus(err)).toBe(403);
    expect(saasErrorBody(err)).toEqual({
      error: err.message,
      code: "PRIVATE_AI_CANARY_BLOCKED",
    });
  });

  it("attaches requestId when provided", () => {
    expect(saasErrorBody(new SaasRbacError("Forbidden", "FORBIDDEN"), { requestId: "req-abc" })).toEqual({
      error: "Forbidden",
      code: "FORBIDDEN",
      requestId: "req-abc",
    });
  });

  it("maps SaasControlPlaneError to 503 SECURITY_UNAVAILABLE", () => {
    const err = new SaasControlPlaneError();
    expect(saasErrorStatus(err)).toBe(503);
    expect(saasErrorBody(err)).toEqual({
      error: "Security controls temporarily unavailable",
      code: "SECURITY_UNAVAILABLE",
    });
  });
});

describe("requestIdFrom", () => {
  it("reads x-request-id header", () => {
    const req = new Request("http://localhost", { headers: { "x-request-id": " rid-1 " } });
    expect(requestIdFrom(req)).toBe("rid-1");
  });
});

describe("requireSaasContext enterprise guards", () => {
  beforeEach(() => {
    getCustomPermissions.mockReset();
    getIpAllowlist.mockReset();
    assertIpAllowed.mockReset();
  });

  it("fail-closes when custom permissions lookup fails transiently", async () => {
    getCustomPermissions.mockRejectedValueOnce(new Error("db connection lost"));
    await expect(
      requireSaasContext(new Request("http://localhost"), "contacts.read"),
    ).rejects.toBeInstanceOf(SaasControlPlaneError);
  });

  it("still uses role RBAC when custom permissions table is missing", async () => {
    getCustomPermissions.mockRejectedValueOnce({ code: "42P01" });
    getIpAllowlist.mockResolvedValue({ enabled: false, cidrs: [] });
    const ctx = await requireSaasContext(new Request("http://localhost"), "contacts.read");
    expect(ctx.tenant.id).toBe("tenant-1");
    expect(ctx.role).toBe("owner");
  });

  it("enforces IP allowlist when configured", async () => {
    getCustomPermissions.mockResolvedValue(null);
    getIpAllowlist.mockResolvedValue({ enabled: true, cidrs: ["10.0.0.0/8"] });
    assertIpAllowed.mockImplementation(() => {
      throw new SaasSecurityEnterpriseError("IP not allowed", "FORBIDDEN");
    });

    await expect(
      requireSaasContext(new Request("http://localhost"), "contacts.read"),
    ).rejects.toBeInstanceOf(SaasRbacError);
  });

  it("fail-closes when IP allowlist lookup fails transiently", async () => {
    getCustomPermissions.mockResolvedValue(null);
    getIpAllowlist.mockRejectedValueOnce(new Error("ECONNRESET"));
    await expect(
      requireSaasContext(new Request("http://localhost"), "contacts.read"),
    ).rejects.toBeInstanceOf(SaasControlPlaneError);
  });
});

describe("webhookInIdempotency", () => {
  beforeEach(() => resetWebhookInIdempotencyForTests());

  it("claims first key and detects duplicates", () => {
    expect(claimWebhookInIdempotency("t1", "stripe", "k1")).toBeNull();
    const prior = claimWebhookInIdempotency("t1", "stripe", "k1");
    expect(typeof prior).toBe("string");
    expect(claimWebhookInIdempotency("t1", "stripe", "k2")).toBeNull();
    expect(claimWebhookInIdempotency("t2", "stripe", "k1")).toBeNull();
  });
});
