import { describe, expect, it, vi } from "vitest";
import { isPgMissingRelation } from "../saasRequestContext";
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

import { requireSaasContext } from "../saasRequestContext";
import { SaasSecurityEnterpriseError } from "../SaasSecurityEnterpriseService";

describe("isPgMissingRelation", () => {
  it("detects postgres missing relation code", () => {
    expect(isPgMissingRelation({ code: "42P01" })).toBe(true);
    expect(isPgMissingRelation(new Error('relation "x" does not exist'))).toBe(true);
    expect(isPgMissingRelation(new Error("other"))).toBe(false);
  });
});

describe("requireSaasContext enterprise guards", () => {
  it("falls back to role RBAC when custom permissions lookup fails transiently", async () => {
    getCustomPermissions.mockRejectedValueOnce(new Error("db connection lost"));
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
});
