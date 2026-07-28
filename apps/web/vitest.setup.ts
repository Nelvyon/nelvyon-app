import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";
import { expect, vi } from "vitest";

expect.extend(matchers);

vi.stubGlobal("React", React);

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock("next/font/google", () => {
  const mockFont = () => ({
    className: "mock-font",
    variable: "--mock-font",
    style: { fontFamily: "mock" },
  });
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "__esModule") return true;
        return mockFont;
      },
    },
  );
});

process.env.JWT_SECRET ??= "super-secret-key-min-32-chars-change-in-production";
/** Unit tests only — real launch gate stays fail-closed outside NODE_ENV=test/VITEST. */
process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS ??= "1";

/** Fire-and-forget usage metering must not hit real DbClient in unit tests. */
vi.mock("../../backend/saas/SaasUsageMeterService", () => ({
  getSaasUsageMeterService: () => ({
    increment: vi.fn().mockResolvedValue(undefined),
    incrementWithSubcuentaMirror: vi.fn().mockResolvedValue(undefined),
    getUsageSnapshot: vi.fn().mockResolvedValue({
      usage: { contacts: 0, deals: 0, campanias: 0, workflows: 0, users: 0 },
      limits: {},
    }),
  }),
}));

/**
 * Enterprise security control plane (custom ACL + IP allowlist) is fail-closed in prod.
 * API route unit tests mock auth/tenant but not DbClient — without this stub they get 503
 * SECURITY_UNAVAILABLE from missing DATABASE_URL. Dedicated security tests override via vi.mock
 * or construct SaasSecurityEnterpriseService({ db }) directly.
 */
vi.mock("../../backend/saas/SaasSecurityEnterpriseService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../backend/saas/SaasSecurityEnterpriseService")>();
  return {
    ...actual,
    getSaasSecurityEnterpriseService: () => ({
      getCustomPermissions: vi.fn().mockResolvedValue(null),
      getIpAllowlist: vi.fn().mockResolvedValue({ enabled: false, cidrs: [] }),
      assertIpAllowed: vi.fn(),
      listCustomRoles: vi.fn().mockResolvedValue([]),
      upsertCustomRole: vi.fn(),
      assignCustomRole: vi.fn(),
      upsertIpAllowlist: vi.fn(),
      listTerritories: vi.fn().mockResolvedValue([]),
      upsertTerritory: vi.fn(),
      listSandboxes: vi.fn().mockResolvedValue([]),
      createSandbox: vi.fn(),
      getMfaStatus: vi.fn().mockResolvedValue({ enabled: false, enforced: false }),
      enrollMfa: vi.fn(),
      verifyMfa: vi.fn().mockResolvedValue(true),
    }),
  };
});
