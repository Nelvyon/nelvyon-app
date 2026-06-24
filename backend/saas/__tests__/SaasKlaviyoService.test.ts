import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasKlaviyoService, SaasKlaviyoError, resetSaasKlaviyoServiceForTests } from "../SaasKlaviyoService";

beforeEach(() => { resetSaasKlaviyoServiceForTests(); });

const API_KEY = "pk_test_abc123";

function makeFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({ ok, status, json: async () => response });
}

describe("SaasKlaviyoService — NOT_CONFIGURED", () => {
  it("getStatus returns configured=false when no key", async () => {
    const svc = new SaasKlaviyoService(null);
    const status = await svc.getStatus();
    expect(status.configured).toBe(false);
    expect(status.accountEmail).toBeNull();
  });

  it("getLists throws NOT_CONFIGURED", async () => {
    const svc = new SaasKlaviyoService(null);
    await expect(svc.getLists()).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("getCampaigns throws NOT_CONFIGURED", async () => {
    const svc = new SaasKlaviyoService(null);
    await expect(svc.getCampaigns()).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("addProfile throws NOT_CONFIGURED", async () => {
    const svc = new SaasKlaviyoService(null);
    await expect(svc.addProfile("list1", "test@example.com")).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });
});

describe("SaasKlaviyoService — configured", () => {
  it("getLists fetches and maps Klaviyo API response", async () => {
    const apiResp = {
      data: [
        { id: "L1", attributes: { name: "Newsletter", profile_count: 1500, created: "2024-01-01" } },
        { id: "L2", attributes: { name: "Customers", profile_count: 300, created: "2024-03-01" } },
      ],
    };
    const mockFetch = makeFetch(apiResp);
    const svc = new SaasKlaviyoService(API_KEY, mockFetch as unknown as typeof fetch);
    const lists = await svc.getLists();
    expect(lists).toHaveLength(2);
    expect(lists[0].id).toBe("L1");
    expect(lists[0].name).toBe("Newsletter");
    expect(lists[0].profileCount).toBe(1500);
  });

  it("getCampaigns fetches and maps Klaviyo API response", async () => {
    const apiResp = {
      data: [
        { id: "C1", attributes: { name: "Summer Sale", status: "sent", scheduled_at: null, created_at: "2026-06-01" } },
      ],
    };
    const mockFetch = makeFetch(apiResp);
    const svc = new SaasKlaviyoService(API_KEY, mockFetch as unknown as typeof fetch);
    const campaigns = await svc.getCampaigns();
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].name).toBe("Summer Sale");
    expect(campaigns[0].status).toBe("sent");
  });

  it("addProfile validates empty email", async () => {
    const svc = new SaasKlaviyoService(API_KEY);
    await expect(svc.addProfile("L1", "")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("addProfile validates empty listId", async () => {
    const svc = new SaasKlaviyoService(API_KEY);
    await expect(svc.addProfile("", "test@x.com")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("addProfile creates profile and adds to list", async () => {
    const profileResp = {
      data: { id: "P1", attributes: { email: "test@example.com", first_name: "Ana", last_name: "López", phone_number: null } },
    };
    const listResp = {};
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => profileResp })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => listResp });
    const svc = new SaasKlaviyoService(API_KEY, mockFetch as unknown as typeof fetch);
    const profile = await svc.addProfile("L1", "test@example.com", "Ana", "López");
    expect(profile.id).toBe("P1");
    expect(profile.email).toBe("test@example.com");
    expect(profile.firstName).toBe("Ana");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("SaasKlaviyoError", () => {
  it("has correct name and code", () => {
    const e = new SaasKlaviyoError("msg", "API_ERROR");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("API_ERROR");
    expect(e.name).toBe("SaasKlaviyoError");
  });
});
