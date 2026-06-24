import { describe, it, expect, vi } from "vitest";
import { SaasCommunitiesService } from "../SaasCommunitiesService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => { let c = 0; return { query: vi.fn(async () => rows[c++] ?? []) }; };
const TENANT = "tenant-com";

const baseCom: Row = {
  id: "com-1", tenantId: TENANT, name: "Marketing Tips",
  description: "Tips for marketers", icon: "💬",
  membersCount: 12, postsCount: 3, createdAt: "2026-06-24T00:00:00Z",
};

const basePost: Row = {
  id: "post-1", communityId: "com-1", tenantId: TENANT,
  authorName: "Alice", authorEmail: "alice@test.com",
  title: "Hello", content: "Welcome everyone!",
  likes: 5, repliesCount: 2, pinned: false, createdAt: "2026-06-24T00:00:00Z",
};

describe("SaasCommunitiesService — listCommunities", () => {
  it("returns empty array", async () => {
    expect(await new SaasCommunitiesService({ db: makeDb([[]]) }).listCommunities(TENANT)).toEqual([]);
  });
  it("maps community row", async () => {
    const [c] = await new SaasCommunitiesService({ db: makeDb([[baseCom]]) }).listCommunities(TENANT);
    expect(c.name).toBe("Marketing Tips");
    expect(c.membersCount).toBe(12);
    expect(c.postsCount).toBe(3);
  });
});

describe("SaasCommunitiesService — getCommunity", () => {
  it("returns null when not found", async () => {
    expect(await new SaasCommunitiesService({ db: makeDb([[]]) }).getCommunity(TENANT, "x")).toBeNull();
  });
  it("returns community", async () => {
    const c = await new SaasCommunitiesService({ db: makeDb([[baseCom]]) }).getCommunity(TENANT, "com-1");
    expect(c?.id).toBe("com-1");
  });
});

describe("SaasCommunitiesService — createCommunity", () => {
  it("throws VALIDATION when name empty", async () => {
    await expect(new SaasCommunitiesService({ db: makeDb() }).createCommunity(TENANT, { name: "" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("creates community", async () => {
    const db = makeDb([[baseCom]]);
    const c = await new SaasCommunitiesService({ db }).createCommunity(TENANT, { name: "Marketing Tips" });
    expect(c.icon).toBe("💬");
    expect(String(db.query.mock.calls[0][0])).toContain("INSERT INTO communities");
  });
});

describe("SaasCommunitiesService — deleteCommunity", () => {
  it("returns false when not found", async () => {
    expect(await new SaasCommunitiesService({ db: makeDb([[]]) }).deleteCommunity(TENANT, "x")).toBe(false);
  });
  it("returns true", async () => {
    expect(await new SaasCommunitiesService({ db: makeDb([[{ id: "com-1" }]]) }).deleteCommunity(TENANT, "com-1")).toBe(true);
  });
});

describe("SaasCommunitiesService — listPosts", () => {
  it("returns posts ordered pinned first", async () => {
    const [p] = await new SaasCommunitiesService({ db: makeDb([[basePost]]) }).listPosts(TENANT, "com-1");
    expect(p.authorName).toBe("Alice");
    expect(p.likes).toBe(5);
  });
});

describe("SaasCommunitiesService — createPost", () => {
  it("throws VALIDATION when content empty", async () => {
    await expect(new SaasCommunitiesService({ db: makeDb() }).createPost(TENANT, "com-1", { authorName: "Alice", content: "" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("throws VALIDATION when authorName empty", async () => {
    await expect(new SaasCommunitiesService({ db: makeDb() }).createPost(TENANT, "com-1", { authorName: "", content: "Hi" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("creates post and increments posts_count", async () => {
    const db = makeDb([[basePost]]);
    const p = await new SaasCommunitiesService({ db }).createPost(TENANT, "com-1", { authorName: "Alice", content: "Welcome!" });
    expect(p.id).toBe("post-1");
    expect(String(db.query.mock.calls[0][0])).toContain("posts_count + 1");
  });
});

describe("SaasCommunitiesService — likePost", () => {
  it("returns false when not found", async () => {
    expect(await new SaasCommunitiesService({ db: makeDb([[]]) }).likePost(TENANT, "x")).toBe(false);
  });
  it("increments likes", async () => {
    const db = makeDb([[{ id: "post-1" }]]);
    expect(await new SaasCommunitiesService({ db }).likePost(TENANT, "post-1")).toBe(true);
    expect(String(db.query.mock.calls[0][0])).toContain("likes = likes + 1");
  });
});

describe("SaasCommunitiesService — pinPost", () => {
  it("sets pinned true", async () => {
    const db = makeDb([[{ id: "post-1" }]]);
    expect(await new SaasCommunitiesService({ db }).pinPost(TENANT, "post-1", true)).toBe(true);
    expect(db.query.mock.calls[0][1]).toContain(true);
  });
});

describe("SaasCommunitiesService — deletePost", () => {
  it("returns false when not found", async () => {
    expect(await new SaasCommunitiesService({ db: makeDb([[]]) }).deletePost(TENANT, "x")).toBe(false);
  });
  it("deletes post and decrements posts_count", async () => {
    const db = makeDb([[{ id: "post-1" }]]);
    expect(await new SaasCommunitiesService({ db }).deletePost(TENANT, "post-1")).toBe(true);
    expect(String(db.query.mock.calls[0][0])).toContain("posts_count - 1");
  });
});
