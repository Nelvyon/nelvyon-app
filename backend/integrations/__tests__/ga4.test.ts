// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAnalytics4Service, resetGA4ServiceForTests } from "../GoogleAnalytics4Service";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [
    {
      user_id: UID,
      property_id: "PROP42",
      access_token: "GA4_ACCESS",
      refresh_token: "GA4_REFRESH",
      token_expiry: new Date(Date.now() + 3_600_000).toISOString(),
      is_active: true,
    },
  ];
}

function mockDbForReads() {
  return vi.fn((sql: string) => {
    if (sql.includes("integration_ga4") && sql.includes("SELECT")) return Promise.resolve(credRow());
    return Promise.resolve([]);
  });
}

function buildFetchMock() {
  return vi.fn().mockImplementation((_url: string | URL, init?: RequestInit) => {
    const raw = typeof init?.body === "string" ? init.body : "{}";
    const body = JSON.parse(raw) as {
      dimensions?: ReadonlyArray<{ name?: string }>;
      metrics?: ReadonlyArray<{ name?: string }>;
      dimensionFilter?: unknown;
    };
    const dimNames = (body.dimensions ?? []).map((d) => d.name ?? "").join("|");
    const metNames = (body.metrics ?? []).map((m) => m.name ?? "").join("|");
    let json: Record<string, unknown>;

    if (!dimNames && metNames.includes("sessions") && metNames.includes("bounceRate")) {
      json = {
        metricHeaders: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
        rows: [{ metricValues: [{ value: "100" }, { value: "40" }, { value: "12" }, { value: "0.35" }, { value: "120.5" }] }],
      };
    } else if (dimNames === "pagePath" && metNames.includes("screenPageViews")) {
      json = {
        dimensionHeaders: [{ name: "pagePath" }],
        metricHeaders: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
        rows: [
          { dimensionValues: [{ value: "/a" }], metricValues: [{ value: "50" }, { value: "30" }] },
          { dimensionValues: [{ value: "/b" }], metricValues: [{ value: "10" }, { value: "5" }] },
        ],
      };
    } else if (dimNames === "eventName" && body.dimensionFilter != null) {
      json = {
        dimensionHeaders: [{ name: "eventName" }],
        metricHeaders: [{ name: "eventCount" }],
        rows: [
          { dimensionValues: [{ value: "purchase" }], metricValues: [{ value: "3" }] },
          { dimensionValues: [{ value: "generate_lead" }], metricValues: [{ value: "8" }] },
        ],
      };
    } else if (dimNames === "sessionDefaultChannelGroup") {
      json = {
        dimensionHeaders: [{ name: "sessionDefaultChannelGroup" }],
        metricHeaders: [{ name: "sessions" }, { name: "conversions" }],
        rows: [
          { dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "200" }, { value: "4" }] },
          { dimensionValues: [{ value: "Paid Search" }], metricValues: [{ value: "50" }, { value: "1" }] },
        ],
      };
    } else if (dimNames === "city" && metNames === "activeUsers") {
      json = {
        dimensionHeaders: [{ name: "city" }],
        metricHeaders: [{ name: "activeUsers" }],
        rows: [{ dimensionValues: [{ value: "Madrid" }], metricValues: [{ value: "77" }] }],
      };
    } else {
      json = { dimensionHeaders: [], metricHeaders: [], rows: [] };
    }

    return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

describe("GoogleAnalytics4Service", () => {
  beforeEach(() => {
    resetGA4ServiceForTests();
    vi.stubGlobal("fetch", buildFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetGA4ServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleAnalytics4Service({ db: { query } });
    await svc.saveCredentials(UID, "properties/777", "at", "rt", new Date("2030-05-01T00:00:00.000Z"));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_ga4"), [
      UID,
      "777",
      "at",
      "rt",
      "2030-05-01T00:00:00.000Z",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new GoogleAnalytics4Service({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.propertyId).toBe("PROP42");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleAnalytics4Service({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("runReport", async () => {
    const query = mockDbForReads();
    const svc = new GoogleAnalytics4Service({ db: { query } });
    const rows = await svc.runReport(UID, { startDate: "2026-01-01", endDate: "2026-01-31" }, ["city"], ["activeUsers"]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.dimensions.city).toBe("Madrid");
    expect(rows[0]?.metrics.activeUsers).toBe("77");
    const url = globalThis.fetch.mock.calls[0][0] as string;
    expect(url).toContain("/properties/PROP42:runReport");
    expect(globalThis.fetch.mock.calls[0][1]?.headers?.Authorization).toMatch(/^Bearer GA4_ACCESS$/);
  });

  it("getSessionsSummary", async () => {
    const query = mockDbForReads();
    const svc = new GoogleAnalytics4Service({ db: { query } });
    const s = await svc.getSessionsSummary(UID, { startDate: "2026-01-01", endDate: "2026-01-07" });
    expect(s.sessions).toBe(100);
    expect(s.activeUsers).toBe(40);
    expect(s.newUsers).toBe(12);
    expect(s.bounceRate).toBeCloseTo(0.35);
    expect(s.avgSessionDuration).toBeCloseTo(120.5);
  });

  it("getTopPages", async () => {
    const query = mockDbForReads();
    const svc = new GoogleAnalytics4Service({ db: { query } });
    const pages = await svc.getTopPages(UID, 5);
    expect(pages[0]?.pagePath).toBe("/a");
    expect(pages[0]?.screenPageViews).toBe(50);
    expect(pages[0]?.avgTimeOnPage).toBe(30);
  });

  it("getConversions", async () => {
    const query = mockDbForReads();
    const svc = new GoogleAnalytics4Service({ db: { query } });
    const conv = await svc.getConversions(UID, { startDate: "2026-01-01", endDate: "2026-01-31" });
    expect(conv.some((x) => x.eventName === "purchase" && x.eventCount === 3)).toBe(true);
    const init = globalThis.fetch.mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.dimensionFilter.filter.fieldName).toBe("isConversionEvent");
  });

  it("getTrafficSources", async () => {
    const query = mockDbForReads();
    const svc = new GoogleAnalytics4Service({ db: { query } });
    const t = await svc.getTrafficSources(UID, { startDate: "2026-01-01", endDate: "2026-01-14" });
    expect(t[0]?.channel).toBe("Organic Search");
    expect(t[0]?.sessions).toBe(200);
    expect(t[0]?.conversions).toBe(4);
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleAnalytics4Service({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_ga4"), [UID]);
  });
});

