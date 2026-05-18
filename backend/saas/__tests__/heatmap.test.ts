// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  HeatmapService,
  getHeatmapService,
  resetHeatmapServiceForTests,
} from "../HeatmapService";

const USER_ID = "00000000-0000-0000-0000-000000000011";
const SITE_KEY = "abc123sitekey00000000001";

describe("HeatmapService", () => {
  beforeEach(() => {
    resetHeatmapServiceForTests();
    vi.clearAllMocks();
  });

  it("createSite genera site_id y script", async () => {
    const q = vi.fn().mockResolvedValueOnce([
      {
        id: "11111111-1111-1111-1111-111111111111",
        user_id: USER_ID,
        domain: "https://x.com",
        site_id: "generatedhex000000000001",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const s = new HeatmapService({ db: { query: q }, llm: { complete: vi.fn() }, appOrigin: "https://app.test" });
    const cfg = await s.createSite(USER_ID, "https://x.com");
    expect(cfg.trackingScript).toContain("generatedhex000000000001");
    expect(cfg.trackingScript).toContain("https://app.test");
  });

  it("trackEvent inserta fila", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ n: "1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const svc = new HeatmapService({ db: { query }, llm: { complete: vi.fn() } });
    await svc.trackEvent(SITE_KEY, "sess1", {
      type: "click",
      x: 100,
      y: 200,
      page: "/",
      timestamp: Date.now(),
    });
    expect(String(query.mock.calls[1][0])).toContain("INSERT INTO heatmap_events");
  });

  it("trackSession upsert", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ n: "1" }]).mockResolvedValueOnce([]);
    const svc = new HeatmapService({ db: { query }, llm: { complete: vi.fn() } });
    await svc.trackSession(SITE_KEY, "s2", {
      userAgent: "Mozilla",
      page: "/",
      device: "desktop",
      scrollDepth: 40,
    });
    expect(String(query.mock.calls[1][0])).toContain("INSERT INTO heatmap_sessions");
  });

  it("getHeatmapData agrega y normaliza", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ n: "1" }])
      .mockResolvedValueOnce([
        { x: 960, y: 540 },
        { x: 960, y: 540 },
      ]);
    const svc = new HeatmapService({ db: { query }, llm: { complete: vi.fn() } });
    const pts = await svc.getHeatmapData(SITE_KEY, USER_ID, "/", "click");
    expect(pts.length).toBeGreaterThan(0);
    expect(pts[0].value).toBe(100);
  });

  it("getSessions lista", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ n: "1" }]).mockResolvedValueOnce([
      {
        id: "1",
        site_id: SITE_KEY,
        session_id: "a",
        user_agent: "x",
        device: "mobile",
        page: "/",
        referrer: null,
        duration: 12,
        scroll_depth: 50,
        pages_viewed: 2,
        has_rage_click: true,
        created_at: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    const svc = new HeatmapService({ db: { query }, llm: { complete: vi.fn() } });
    const rows = await svc.getSessions(SITE_KEY, USER_ID);
    expect(rows[0].hasRageClick).toBe(true);
  });

  it("getFunnelAnalysis", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ n: "1" }])
      .mockResolvedValueOnce([
        { session_id: "a", page: "/", timestamp_ms: "1" },
        { session_id: "a", page: "/pricing", timestamp_ms: "2" },
      ]);
    const svc = new HeatmapService({ db: { query }, llm: { complete: vi.fn() } });
    const f = await svc.getFunnelAnalysis(SITE_KEY, USER_ID, ["/", "/pricing"]);
    expect(f.steps).toHaveLength(2);
    expect(f.steps[0].sessions).toBeGreaterThanOrEqual(1);
  });

  it("analyzeWithAI parsea JSON", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ n: "1" }])
      .mockResolvedValueOnce([
        { total: "10", rage: "1", avg_scroll: "40", avg_dur: "30", bounce: "2" },
      ])
      .mockResolvedValueOnce([{ page: "/", c: "5" }]);
    const llm = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          insights: ["i1"],
          criticalIssues: ["c1"],
          recommendations: ["r1"],
          priorityScore: 72,
        }),
      ),
    };
    const svc = new HeatmapService({ db: { query }, llm });
    const a = await svc.analyzeWithAI(SITE_KEY, USER_ID);
    expect(a.priorityScore).toBe(72);
    expect(a.insights[0]).toBe("i1");
  });

  it("checkAlerts inserta si umbrales", async () => {
    const query = vi.fn().mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("COUNT(*)::text AS n FROM heatmap_sites WHERE site_id") && s.includes("user_id")) {
        return Promise.resolve([{ n: "1" }]);
      }
      if (s.includes("COUNT(*)::text AS total")) {
        return Promise.resolve([{ total: "20", rage: "2", bounce: "17", avg_scroll: "20" }]);
      }
      if (s.includes("INSERT INTO heatmap_alerts")) {
        return Promise.resolve([
          {
            id: "a1",
            site_id: SITE_KEY,
            user_id: USER_ID,
            type: "test",
            message: "m",
            severity: "high",
            created_at: new Date(),
          },
        ]);
      }
      return Promise.resolve([]);
    });
    const svc = new HeatmapService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.checkAlerts(SITE_KEY, USER_ID);
    expect(out.length).toBe(3);
  });

  it("getHeatmapService singleton", () => {
    resetHeatmapServiceForTests();
    expect(getHeatmapService()).toBe(getHeatmapService());
  });
});
