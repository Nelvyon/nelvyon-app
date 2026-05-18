// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleSearchConsoleService, resetSearchConsoleServiceForTests } from "../GoogleSearchConsoleService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const SITE = "https://example.com/";

function credRow() {
  return [
    {
      user_id: UID,
      site_url: SITE,
      access_token: "GSC_ACCESS",
      refresh_token: "GSC_REFRESH",
      token_expiry: new Date(Date.now() + 3_600_000).toISOString(),
      is_active: true,
    },
  ];
}

describe("GoogleSearchConsoleService", () => {
  beforeEach(() => {
    resetSearchConsoleServiceForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: string | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.url;
        let json: Record<string, unknown>;
        if (url.includes("searchAnalytics/query")) {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          const dims = body.dimensions as string[] | undefined;
          if (dims?.length === 1 && dims[0] === "query") {
            json = {
              rows: [
                { keys: ["kw a"], clicks: 20, impressions: 200, ctr: 0.1, position: 3 },
                { keys: ["kw b"], clicks: 5, impressions: 50, ctr: 0.1, position: 9 },
              ],
            };
          } else if (dims?.length === 1 && dims[0] === "page") {
            json = {
              rows: [
                { keys: ["/x"], clicks: 1, impressions: 400, ctr: 0.0025, position: 12 },
                { keys: ["/y"], clicks: 50, impressions: 100, ctr: 0.5, position: 1 },
              ],
            };
          } else if (dims === undefined || (Array.isArray(dims) && dims.length === 0)) {
            json = {
              rows: [{ clicks: 100, impressions: 1000, ctr: 0.1, position: 4 }],
            };
          } else {
            json = {
              rows: [
                {
                  keys: ["hello", "https://example.com/p"],
                  clicks: 7,
                  impressions: 700,
                  ctr: 0.01,
                  position: 6.5,
                },
              ],
            };
          }
        } else {
          json = {};
        }
        return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSearchConsoleServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleSearchConsoleService({ db: { query } });
    await svc.saveCredentials(UID, SITE, "at", "rt", new Date("2030-01-01T00:00:00.000Z"));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_search_console"), [
      UID,
      SITE,
      "at",
      "rt",
      "2030-01-01T00:00:00.000Z",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new GoogleSearchConsoleService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.siteUrl).toBe(SITE);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleSearchConsoleService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("getSearchAnalytics", async () => {
    const query = vi.fn().mockResolvedValueOnce(credRow());
    const svc = new GoogleSearchConsoleService({ db: { query } });
    const rows = await svc.getSearchAnalytics(UID, { startDate: "2026-01-01", endDate: "2026-01-28" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.query).toBe("hello");
    expect(rows[0]?.page).toBe("https://example.com/p");
    expect(rows[0]?.clicks).toBe(7);
    const encoded = encodeURIComponent(SITE);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/sites/${encoded}/searchAnalytics/query`),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("getTopKeywords", async () => {
    const query = vi.fn().mockResolvedValueOnce(credRow());
    const svc = new GoogleSearchConsoleService({ db: { query } });
    const kws = await svc.getTopKeywords(UID, 5);
    expect(kws[0]?.keyword).toBe("kw a");
    expect(kws[0]?.clicks).toBe(20);
    expect(kws).toHaveLength(2);
  });

  it("getTopPages", async () => {
    const query = vi.fn().mockResolvedValueOnce(credRow());
    const svc = new GoogleSearchConsoleService({ db: { query } });
    const pages = await svc.getTopPages(UID, 5);
    expect(pages[0]?.page).toBe("/x");
    expect(pages[0]?.impressions).toBe(400);
    expect(pages).toHaveLength(2);
  });

  it("getSummary", async () => {
    const query = vi.fn().mockResolvedValueOnce(credRow());
    const svc = new GoogleSearchConsoleService({ db: { query } });
    const s = await svc.getSummary(UID);
    expect(s.totalClicks).toBe(100);
    expect(s.totalImpressions).toBe(1000);
    expect(s.averageCtr).toBeCloseTo(0.1);
    expect(s.averagePosition).toBe(4);
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new GoogleSearchConsoleService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_search_console"), [UID]);
  });
});
