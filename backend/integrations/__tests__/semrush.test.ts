// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseSemrushCsv, resetSemrushServiceForTests, SemrushService } from "../SemrushService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [{ user_id: UID, api_key: "K_SECRET", is_active: true }];
}

function mockDbReads() {
  return vi.fn((sql: string) => {
    if (sql.includes("integration_semrush") && sql.includes("SELECT")) return Promise.resolve(credRow());
    return Promise.resolve([]);
  });
}

function csvForUrl(url: string): string {
  const u = new URL(url);
  const type = u.searchParams.get("type");
  switch (type) {
    case "domain_rank":
      return "Dn;Rk;Or;Ot;Oc;Ad;At;Ac\nexample.com;15;500;10000;250.5;20;500;30.2";
    case "domain_organic":
      return "Ph;Po;Nq;Cp;Co;Tr;Tc;Nr;Td\nseo tips;3;1200;1.5;0.66;400;0;900000;1\nbrand;7;800;0.9;0.5;100;0;800000;0";
    case "domain_organic_organic":
      return "Dn;Np;Or;Ot;Oc;Ad\ncompetitor.com;120;800;5000;100;5\nother.net;90;600;3000;80;3";
    case "backlinks_overview":
      return "total;domains_num;ascore\n50000;900;72";
    case "phrase_this":
      return "Ph;Nq;Cp;Co;Nr;Td\nmarketing software;5000;2.1;0.55;12000000;1";
    default:
      return "X\n";
  }
}

describe("SemrushService", () => {
  beforeEach(() => {
    resetSemrushServiceForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: string | URL) => {
        const csv = csvForUrl(String(input));
        return new Response(csv, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSemrushServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SemrushService({ db: { query } });
    await svc.saveCredentials(UID, "my-key");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_semrush"), [UID, "my-key"]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new SemrushService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.apiKey).toBe("K_SECRET");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SemrushService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("getDomainOverview", async () => {
    const query = mockDbReads();
    const svc = new SemrushService({ db: { query } });
    const o = await svc.getDomainOverview(UID, "Example.COM", "us");
    expect(o.domain).toBe("example.com");
    expect(o.rank).toBe(15);
    expect(o.organicKeywords).toBe(500);
    expect(o.organicTraffic).toBe(10000);
    expect(globalThis.fetch.mock.calls[0][0]).toContain("api.semrush.com");
    expect(globalThis.fetch.mock.calls[0][0]).toContain("type=domain_rank");
    expect(globalThis.fetch.mock.calls[0][0]).toContain("key=K_SECRET");
  });

  it("getTopKeywords", async () => {
    const query = mockDbReads();
    const svc = new SemrushService({ db: { query } });
    const kws = await svc.getTopKeywords(UID, "example.com", 5);
    expect(kws).toHaveLength(2);
    expect(kws[0]?.keyword).toBe("seo tips");
    expect(kws[0]?.position).toBe(3);
    expect(globalThis.fetch.mock.calls[0][0]).toContain("type=domain_organic");
  });

  it("getCompetitors", async () => {
    const query = mockDbReads();
    const svc = new SemrushService({ db: { query } });
    const comps = await svc.getCompetitors(UID, "example.com", 10);
    expect(comps[0]?.domain).toBe("competitor.com");
    expect(comps[0]?.commonKeywords).toBe(120);
    expect(globalThis.fetch.mock.calls[0][0]).toContain("type=domain_organic_organic");
  });

  it("getBacklinks", async () => {
    const query = mockDbReads();
    const svc = new SemrushService({ db: { query } });
    const b = await svc.getBacklinks(UID, "example.com");
    expect(b.totalBacklinks).toBe(50000);
    expect(b.referringDomains).toBe(900);
    expect(b.authorityScore).toBe(72);
    expect(globalThis.fetch.mock.calls[0][0]).toContain("backlinks_overview");
    expect(globalThis.fetch.mock.calls[0][0]).toContain("target_type=root_domain");
  });

  it("getKeywordResearch", async () => {
    const query = mockDbReads();
    const svc = new SemrushService({ db: { query } });
    const r = await svc.getKeywordResearch(UID, "marketing software", "us");
    expect(r.keyword).toBe("marketing software");
    expect(r.searchVolume).toBe(5000);
    expect(r.results).toBe(12000000);
    expect(globalThis.fetch.mock.calls[0][0]).toContain("type=phrase_this");
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SemrushService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_semrush"), [UID]);
  });
});

describe("parseSemrushCsv", () => {
  it("divide por \\n y ;", () => {
    const { headers, rows } = parseSemrushCsv("A;B\n1;2\n3;4");
    expect(headers).toEqual(["A", "B"]);
    expect(rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});
