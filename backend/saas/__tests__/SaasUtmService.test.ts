import { describe, it, expect, vi } from "vitest";
import { SaasUtmService } from "../SaasUtmService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-utm";
const now = new Date();

const linkRow = {
  id: "utm1", tenant_id: TENANT, name: "Summer Campaign",
  destination_url: "https://example.com/landing",
  utm_source: "email", utm_medium: "newsletter", utm_campaign: "summer2026",
  utm_term: null, utm_content: null, short_code: "abc12345", clicks: "42", created_at: now,
};

describe("SaasUtmService", () => {
  it("list returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasUtmService(db);
    expect(await svc.list(TENANT)).toEqual([]);
  });

  it("create validates empty name", async () => {
    const db = makeDb();
    const svc = new SaasUtmService(db);
    await expect(svc.create(TENANT, {
      name: "", destinationUrl: "https://example.com", utmSource: "email",
      utmMedium: "newsletter", utmCampaign: "summer",
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("create validates invalid URL", async () => {
    const db = makeDb();
    const svc = new SaasUtmService(db);
    await expect(svc.create(TENANT, {
      name: "Test", destinationUrl: "not-a-url", utmSource: "email",
      utmMedium: "newsletter", utmCampaign: "summer",
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("create requires utm_source", async () => {
    const db = makeDb();
    const svc = new SaasUtmService(db);
    await expect(svc.create(TENANT, {
      name: "Test", destinationUrl: "https://example.com", utmSource: "",
      utmMedium: "newsletter", utmCampaign: "summer",
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("create inserts and returns link with fullUrl", async () => {
    const db = makeDb([[linkRow]]);
    const svc = new SaasUtmService(db);
    const link = await svc.create(TENANT, {
      name: "Summer Campaign", destinationUrl: "https://example.com/landing",
      utmSource: "email", utmMedium: "newsletter", utmCampaign: "summer2026",
    });
    expect(link.id).toBe("utm1");
    expect(link.shortCode).toBe("abc12345");
    expect(link.fullUrl).toContain("utm_source=email");
    expect(link.fullUrl).toContain("utm_medium=newsletter");
    expect(link.clicks).toBe(42);
  });

  it("create generates unique short_code each time", async () => {
    const row1 = { ...linkRow, short_code: "aaaa1111" };
    const row2 = { ...linkRow, short_code: "bbbb2222" };
    const db1 = makeDb([[row1]]);
    const db2 = makeDb([[row2]]);
    const svc1 = new SaasUtmService(db1);
    const svc2 = new SaasUtmService(db2);
    const l1 = await svc1.create(TENANT, { name: "A", destinationUrl: "https://a.com", utmSource: "e", utmMedium: "m", utmCampaign: "c" });
    const l2 = await svc2.create(TENANT, { name: "B", destinationUrl: "https://b.com", utmSource: "e", utmMedium: "m", utmCampaign: "c" });
    expect(l1.shortCode).not.toBe(l2.shortCode);
  });

  it("get throws NOT_FOUND for missing link", async () => {
    const db = makeDb([[]]);
    const svc = new SaasUtmService(db);
    await expect(svc.get(TENANT, "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("delete throws NOT_FOUND for missing link", async () => {
    const db = makeDb([[]]);
    const svc = new SaasUtmService(db);
    await expect(svc.delete(TENANT, "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("trackClick increments clicks and returns fullUrl", async () => {
    const db = makeDb([[linkRow], [], []]); // getByShortCode, UPDATE, INSERT click
    const svc = new SaasUtmService(db);
    const url = await svc.trackClick("abc12345", { ip: "1.2.3.4", userAgent: "Mozilla" });
    expect(url).toContain("utm_source=email");
    expect(db.query).toHaveBeenCalledTimes(3); // getByShortCode SELECT + UPDATE + INSERT click
  });

  it("trackClick throws NOT_FOUND for unknown short code", async () => {
    const db = makeDb([[]]);
    const svc = new SaasUtmService(db);
    await expect(svc.trackClick("unknown")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("getStats returns aggregated stats", async () => {
    const db = makeDb([
      [linkRow],       // get()
      [{ count: "42" }], // total
      [{ count: "5" }],  // today
      [{ count: "18" }], // week
      [{ count: "35" }], // month
      [{ referer: "https://google.com", count: "20" }, { referer: null, count: "22" }], // referers
      [{ date: "2026-06-23", count: "5" }], // by day
    ]);
    const svc = new SaasUtmService(db);
    const stats = await svc.getStats(TENANT, "utm1");
    expect(stats.totalClicks).toBe(42);
    expect(stats.clicksToday).toBe(5);
    expect(stats.clicksThisWeek).toBe(18);
    expect(stats.topReferers).toHaveLength(2);
    expect(stats.clicksByDay).toHaveLength(1);
  });
});
