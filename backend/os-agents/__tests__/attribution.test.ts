import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

import { AttributionService } from "../attribution/AttributionService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

const sampleTouchpoints = [
  {
    id: "t1",
    user_id: USER_ID,
    contact_id: "c1",
    channel: "google_ads",
    campaign: "c",
    source: "google",
    medium: "cpc",
    content: null,
    converted: false,
    revenue: "0",
    occurred_at: "2026-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "t2",
    user_id: USER_ID,
    contact_id: "c1",
    channel: "email",
    campaign: "c",
    source: "mail",
    medium: "owned",
    content: null,
    converted: false,
    revenue: "0",
    occurred_at: "2026-01-02T00:00:00.000Z",
    created_at: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "t3",
    user_id: USER_ID,
    contact_id: "c1",
    channel: "direct",
    campaign: null,
    source: null,
    medium: null,
    content: null,
    converted: true,
    revenue: "100",
    occurred_at: "2026-01-03T00:00:00.000Z",
    created_at: "2026-01-03T00:00:00.000Z",
  },
];

function setupTouchpointAndReportQueries(touchpoints: typeof sampleTouchpoints): void {
  queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes("FROM attribution_touchpoints")) return touchpoints;
    if (sql.includes("INSERT INTO attribution_reports")) {
      return [
        {
          id: "r1",
          user_id: USER_ID,
          model: String(params?.[1] ?? "first_touch"),
          period_start: params?.[2] ?? null,
          period_end: params?.[3] ?? null,
          results: JSON.parse(String(params?.[4] ?? "[]")),
          created_at: "2026-01-04T00:00:00.000Z",
        },
      ];
    }
    return [];
  });
}

describe("AttributionService", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("recordTouchpoint inserta correctamente", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: "t100",
        user_id: USER_ID,
        contact_id: null,
        channel: "organic",
        campaign: "x",
        source: "google",
        medium: "seo",
        content: null,
        converted: false,
        revenue: "0",
        occurred_at: "2026-01-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const t = await AttributionService.recordTouchpoint(USER_ID, { channel: "organic", source: "google", medium: "seo" });
    expect(t.channel).toBe("organic");
    expect(String(queryMock.mock.calls[0][0])).toContain("INSERT INTO attribution_touchpoints");
  });

  it("runModel first_touch asigna 100% al primer canal", async () => {
    setupTouchpointAndReportQueries(sampleTouchpoints);
    const r = await AttributionService.runModel(USER_ID, "first_touch");
    expect(r.results[0]?.channel).toBe("google_ads");
    expect(r.results[0]?.credit).toBeCloseTo(100, 5);
  });

  it("runModel linear reparte igual", async () => {
    setupTouchpointAndReportQueries(sampleTouchpoints);
    const r = await AttributionService.runModel(USER_ID, "linear");
    const channels = Object.fromEntries(r.results.map((x) => [x.channel, x.credit]));
    expect(channels.google_ads).toBeCloseTo(33.333, 1);
    expect(channels.email).toBeCloseTo(33.333, 1);
    expect(channels.direct).toBeCloseTo(33.333, 1);
  });

  it("runModel time_decay da más crédito al más reciente", async () => {
    setupTouchpointAndReportQueries(sampleTouchpoints);
    const r = await AttributionService.runModel(USER_ID, "time_decay");
    const top = r.results[0];
    expect(top.channel).toBe("direct");
    const credits = Object.fromEntries(r.results.map((x) => [x.channel, x.credit]));
    expect(credits.direct).toBeGreaterThan(credits.email);
    expect(credits.email).toBeGreaterThan(credits.google_ads);
  });

  it("compareModels devuelve los 5 modelos", async () => {
    setupTouchpointAndReportQueries(sampleTouchpoints);
    const out = await AttributionService.compareModels(USER_ID, "2026-01-01T00:00:00.000Z", "2026-01-05T00:00:00.000Z");
    expect(Object.keys(out).sort()).toEqual(
      ["first_touch", "last_touch", "linear", "position_based", "time_decay"].sort(),
    );
  });
});
