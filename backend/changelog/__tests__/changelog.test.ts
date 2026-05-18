import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { ChangelogService } from "../ChangelogService";

describe("ChangelogService", () => {
  beforeEach(() => {
    ChangelogService.reset();
    queryMock.mockReset();
  });

  it("getChangelog devuelve entradas publicadas", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: "c1",
        version: "1.0.0",
        title: "Launch",
        body: "Body",
        type: "feature",
        published_at: "2026-05-16T00:00:00.000Z",
        is_published: true,
        created_at: "2026-05-16T00:00:00.000Z",
      },
    ]);
    const svc = ChangelogService.instance();
    const entries = await svc.getChangelog();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.version).toBe("1.0.0");
    expect(entries[0]!.isPublished).toBe(true);
    const [sql] = queryMock.mock.calls[0]!;
    expect(String(sql)).toContain("is_published = true");
    expect(String(sql)).toContain("ORDER BY published_at DESC");
  });

  it("getRoadmap devuelve items públicos ordenados por status", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: "r1",
        title: "API",
        description: "REST",
        status: "planned",
        category: "core",
        votes: 5,
        eta: "Q3 2026",
        is_public: true,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "r2",
        title: "TikTok",
        description: "OAuth",
        status: "in_progress",
        category: "integrations",
        votes: 2,
        eta: "Mayo 2026",
        is_public: true,
        created_at: "2026-05-02T00:00:00.000Z",
        updated_at: "2026-05-02T00:00:00.000Z",
      },
    ]);
    const svc = ChangelogService.instance();
    const items = await svc.getRoadmap();
    expect(items).toHaveLength(2);
    expect(items[0]!.status).toBe("planned");
    expect(items[1]!.isPublic).toBe(true);
    const [sql] = queryMock.mock.calls[0]!;
    expect(String(sql)).toContain("is_public = true");
    expect(String(sql)).toContain("ORDER BY status ASC");
  });
});
