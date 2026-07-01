import { describe, expect, it, vi } from "vitest";

import { computeMlDealForecast } from "../saasDealForecast";
import type { SaasDeal } from "../SaasDealsService";

const baseDeal = (overrides: Partial<SaasDeal>): SaasDeal => ({
  id: "d1",
  tenantId: "t1",
  contactId: null,
  title: "Deal",
  value: 1000,
  currency: "EUR",
  stage: "proposal",
  probability: 50,
  expectedCloseDate: null,
  source: null,
  ownerUserId: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("computeMlDealForecast", () => {
  it("returns weighted forecast for open deals", () => {
    const result = computeMlDealForecast([
      baseDeal({ id: "1", stage: "proposal", value: 1000, probability: 50 }),
      baseDeal({ id: "2", stage: "qualified", value: 2000, probability: 30 }),
    ]);
    expect(result.forecastValue).toBeGreaterThan(0);
    expect(result.method).toBe("weighted_ml_v1");
    expect(result.forecastConfidence).toBeGreaterThan(0);
  });

  it("ignores won/lost in forecast value", () => {
    const result = computeMlDealForecast([
      baseDeal({ stage: "won", value: 5000 }),
      baseDeal({ stage: "lost", value: 3000 }),
    ]);
    expect(result.forecastValue).toBe(0);
  });
});

describe("SaasScimService", () => {
  it("lists users for tenant", async () => {
    const { SaasScimService } = await import("../SaasScimService");
    const db = {
      query: vi.fn().mockResolvedValue([
        { id: "u1", tenant_id: "t1", email: "a@test.com", name: "Ana", role: "admin", status: "active" },
      ]),
    };
    const svc = new SaasScimService(db);
    const { items, total } = await svc.listUsers("t1");
    expect(total).toBe(1);
    expect(items[0]?.userName).toBe("a@test.com");
  });

  it("lists role groups with members", async () => {
    const { SaasScimService } = await import("../SaasScimService");
    const db = {
      query: vi.fn().mockResolvedValue([
        { id: "u1", email: "a@test.com", role: "admin" },
        { id: "u2", email: "b@test.com", role: "user" },
      ]),
    };
    const svc = new SaasScimService(db);
    const { total, items } = await svc.listGroups("t1");
    expect(total).toBe(3);
    expect(items.find((g) => g.id === "admin")?.members).toHaveLength(1);
    expect(items.find((g) => g.id === "user")?.members).toHaveLength(1);
  });
});
