import { describe, expect, it, vi } from "vitest";

import { SaasWhiteLabelService, saasWhiteLabelService, type WhiteLabelConfig } from "../SaasWhiteLabelService";

const cfg = (over: Partial<WhiteLabelConfig> = {}): WhiteLabelConfig => ({
  id: "00000000-0000-0000-0000-000000000001",
  tenantId: "tenant-1",
  agencyName: "Acme Agency",
  logoUrl: "https://cdn/logo.png",
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  customDomain: "acme.example.com",
  faviconUrl: "https://cdn/favicon.ico",
  supportEmail: "soporte@acme.com",
  footerText: "© Acme",
  hideNelvyonBranding: false,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("SaasWhiteLabelService", () => {
  it("getConfig devuelve config existente", async () => {
    const query = vi.fn().mockResolvedValue([cfg()]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    const out = await svc.getConfig("tenant-1");
    expect(out?.tenantId).toBe("tenant-1");
  });

  it("getConfig devuelve null si no existe", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    expect(await svc.getConfig("none")).toBeNull();
  });

  it("upsertConfig crea config nueva con valores por defecto de colores", async () => {
    const query = vi.fn().mockResolvedValue([cfg({ primaryColor: "#6366f1", secondaryColor: "#8b5cf6" })]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    const out = await svc.upsertConfig("tenant-1", { agencyName: "Acme" });
    expect(out.primaryColor).toBe("#6366f1");
    expect(out.secondaryColor).toBe("#8b5cf6");
  });

  it("upsertConfig actualiza config existente sin borrar campos no enviados", async () => {
    const query = vi.fn().mockResolvedValue([cfg({ agencyName: "Nuevo Nombre", logoUrl: "https://cdn/logo.png" })]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    await svc.upsertConfig("tenant-1", { agencyName: "Nuevo Nombre" });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("COALESCE(EXCLUDED.agency_name");
    expect(sql).toContain("COALESCE(EXCLUDED.logo_url");
  });

  it("upsertConfig con hideNelvyonBranding=true lo guarda correctamente", async () => {
    const query = vi.fn().mockResolvedValue([cfg({ hideNelvyonBranding: true })]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    const out = await svc.upsertConfig("tenant-1", { hideNelvyonBranding: true });
    expect(out.hideNelvyonBranding).toBe(true);
  });

  it("getConfigByDomain devuelve config por dominio personalizado", async () => {
    const query = vi.fn().mockResolvedValue([cfg({ customDomain: "brand.example.com" })]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    const out = await svc.getConfigByDomain("brand.example.com");
    expect(out?.customDomain).toBe("brand.example.com");
  });

  it("getConfigByDomain con dominio inexistente devuelve null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    expect(await svc.getConfigByDomain("none.example.com")).toBeNull();
  });

  it("getConfigByDomain filtra por active=true", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    await svc.getConfigByDomain("brand.example.com");
    expect(String(query.mock.calls[0]?.[0])).toContain("active = true");
  });

  it("getConfigByDomain con config inactiva devuelve null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    expect(await svc.getConfigByDomain("inactive.example.com")).toBeNull();
  });

  it("deactivate desactiva y devuelve true", async () => {
    const query = vi.fn().mockResolvedValue([{ id: "x" }]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    expect(await svc.deactivate("tenant-1")).toBe(true);
  });

  it("deactivate con tenant sin config devuelve false", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    expect(await svc.deactivate("tenant-missing")).toBe(false);
  });

  it("upsertConfig lanza si RETURNING no devuelve fila", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasWhiteLabelService({ db: { query } });
    await expect(svc.upsertConfig("tenant-1", { agencyName: "Acme" })).rejects.toThrow("no row");
  });

  it("saasWhiteLabelService singleton es instancia de SaasWhiteLabelService", () => {
    expect(saasWhiteLabelService).toBeInstanceOf(SaasWhiteLabelService);
  });
});
