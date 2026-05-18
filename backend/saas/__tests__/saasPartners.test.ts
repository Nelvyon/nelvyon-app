import { describe, expect, it, vi } from "vitest";

import { SaasPartnersService, saasPartnersService, type Partner, type PartnerReferral } from "../SaasPartnersService";

const partnerRow = (over: Partial<Partner> = {}): Partner => ({
  id: "00000000-0000-0000-0000-000000000001",
  userId: "user123456",
  tenantId: "tenant-1",
  referralCode: "NEL-USER1234-ABCDE",
  commissionRate: 0.3,
  totalReferrals: 0,
  totalEarningsEur: 0,
  pendingEarningsEur: 0,
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const referralRow = (over: Partial<PartnerReferral> = {}): PartnerReferral => ({
  id: "00000000-0000-0000-0000-000000000099",
  partnerId: "00000000-0000-0000-0000-000000000001",
  referredUserId: "ref-1",
  commissionEur: 29.1,
  status: "pending",
  createdAt: "2026-01-02T00:00:00.000Z",
  ...over,
});

describe("SaasPartnersService", () => {
  it("registerPartner crea partner con referral code único formato NEL-XXXXXXXX-XXXXX", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([partnerRow({ referralCode: "NEL-ABCDEFGH-1A2B3" })]);
    const svc = new SaasPartnersService({ db: { query } });
    const out = await svc.registerPartner("abcdefgh123", "tenant-1");
    expect(out.referralCode).toMatch(/^NEL-[A-Z0-9]{8}-[A-Z0-9]{5}$/);
  });

  it("registerPartner lanza error si ya es partner", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ id: "x" }]);
    const svc = new SaasPartnersService({ db: { query } });
    await expect(svc.registerPartner("u1", "t1")).rejects.toThrow("Ya eres partner");
  });

  it("getPartner devuelve partner existente", async () => {
    const query = vi.fn().mockResolvedValue([partnerRow()]);
    const svc = new SaasPartnersService({ db: { query } });
    const out = await svc.getPartner("user123456");
    expect(out?.userId).toBe("user123456");
  });

  it("getPartner devuelve null si no existe", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasPartnersService({ db: { query } });
    expect(await svc.getPartner("none")).toBeNull();
  });

  it("registerReferral con código válido crea referral y calcula comisión 30%", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "p1", commission_rate: 0.3 }])
      .mockResolvedValueOnce([referralRow({ commissionEur: 30 })])
      .mockResolvedValueOnce([]);
    const svc = new SaasPartnersService({ db: { query } });
    const out = await svc.registerReferral("NEL-CODE", "ref-user", 100);
    expect(out?.commissionEur).toBe(30);
  });

  it("registerReferral actualiza totalReferrals y totalEarningsEur del partner", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "p1", commission_rate: 0.3 }])
      .mockResolvedValueOnce([referralRow({ commissionEur: 15 })])
      .mockResolvedValueOnce([]);
    const svc = new SaasPartnersService({ db: { query } });
    await svc.registerReferral("NEL-CODE", "ref-user", 50);
    const updateCall = query.mock.calls[2];
    expect(String(updateCall?.[0])).toContain("total_referrals = total_referrals + 1");
    expect((updateCall?.[1] as unknown[])?.[0]).toBe(15);
  });

  it("registerReferral con código inválido devuelve null", async () => {
    const query = vi.fn().mockResolvedValueOnce([]);
    const svc = new SaasPartnersService({ db: { query } });
    expect(await svc.registerReferral("BAD", "ref-user", 100)).toBeNull();
  });

  it("getReferrals devuelve referidos ordenados DESC", async () => {
    const query = vi.fn().mockResolvedValue([referralRow(), referralRow({ id: "2" })]);
    const svc = new SaasPartnersService({ db: { query } });
    const out = await svc.getReferrals("p1");
    expect(out).toHaveLength(2);
    expect(String(query.mock.calls[0]?.[0])).toContain("ORDER BY created_at DESC");
  });

  it("registerPartner usa comisión por defecto 0.30", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([partnerRow({ commissionRate: 0.3 })]);
    const svc = new SaasPartnersService({ db: { query } });
    const out = await svc.registerPartner("abcdef12", "t1");
    expect(out.commissionRate).toBe(0.3);
  });

  it("registerPartner lanza si INSERT no retorna fila", async () => {
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const svc = new SaasPartnersService({ db: { query } });
    await expect(svc.registerPartner("abcdef12", "t1")).rejects.toThrow("no row");
  });

  it("registerReferral lanza si INSERT no retorna fila", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ id: "p1", commission_rate: 0.3 }]).mockResolvedValueOnce([]);
    const svc = new SaasPartnersService({ db: { query } });
    await expect(svc.registerReferral("NEL-CODE", "ref-user", 100)).rejects.toThrow("no row");
  });

  it("saasPartnersService singleton es instancia de SaasPartnersService", () => {
    expect(saasPartnersService).toBeInstanceOf(SaasPartnersService);
  });
});
