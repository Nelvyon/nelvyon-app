import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

import { ClientProfileService } from "../client-profile/ClientProfileService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

describe("ClientProfileService", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("getProfile devuelve null si no existe", async () => {
    queryMock.mockResolvedValueOnce([]);
    const p = await ClientProfileService.getProfile(USER_ID, "Acme");
    expect(p).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("getProfile no consulta si brandName vacío", async () => {
    const p = await ClientProfileService.getProfile(USER_ID, "  ");
    expect(p).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("upsertProfile inserta y devuelve perfil", async () => {
    const row = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: USER_ID,
      brand_name: "Acme",
      brand_voice: "directo",
      target_audience: "pymes",
      industry: "saas",
      competitors: ["B"],
      usp: "velocidad",
      colors: ["#000"],
      keywords: ["crm"],
      past_results: {},
      preferences: {},
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    queryMock.mockResolvedValueOnce([row]);
    const profile = await ClientProfileService.upsertProfile(USER_ID, {
      brand_name: "Acme",
      brand_voice: "directo",
      target_audience: "pymes",
      industry: "saas",
      competitors: ["B"],
      usp: "velocidad",
      colors: ["#000"],
      keywords: ["crm"],
    });
    expect(profile.brand_name).toBe("Acme");
    expect(profile.brand_voice).toBe("directo");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("enrichInput hace merge con input base cuando hay perfil", async () => {
    const row = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: USER_ID,
      brand_name: "Acme",
      brand_voice: "cercano",
      target_audience: "consumidor",
      industry: "retail",
      competitors: ["X"],
      usp: "precio",
      colors: ["#fff"],
      keywords: ["oferta"],
      past_results: { last: "ok" },
      preferences: { tone: "casual" },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    queryMock.mockResolvedValueOnce([row]);
    const base = { foo: 1, brandName: "Acme" };
    const enriched = await ClientProfileService.enrichInput(USER_ID, "Acme", base);
    expect(enriched).toMatchObject({
      foo: 1,
      brandName: "Acme",
      clientProfile_brand_name: "Acme",
      clientProfile_brand_voice: "cercano",
    });
    expect(typeof (enriched as { _clientProfileBrief?: string })._clientProfileBrief).toBe("string");
    expect((enriched as { _clientProfileBrief: string })._clientProfileBrief).toContain("Acme");
  });

  it("enrichInput sin brandName devuelve input sin cambios", async () => {
    const base = { a: true };
    const enriched = await ClientProfileService.enrichInput(USER_ID, "", base);
    expect(enriched).toEqual(base);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("enrichInput sin perfil en BD devuelve base", async () => {
    queryMock.mockResolvedValueOnce([]);
    const base = { x: 2 };
    const enriched = await ClientProfileService.enrichInput(USER_ID, "Ghost", base);
    expect(enriched).toEqual(base);
  });

  it("enrichInput ante fallo de DB devuelve base (enriquecimiento opcional)", async () => {
    queryMock.mockRejectedValueOnce(new Error("connection refused"));
    const base = { k: 1 };
    const enriched = await ClientProfileService.enrichInput(USER_ID, "Acme", base);
    expect(enriched).toEqual(base);
  });
});
