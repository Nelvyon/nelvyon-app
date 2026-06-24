import { describe, it, expect, vi } from "vitest";
import { SaasSocialService } from "../SaasSocialService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-social";
const now = new Date();

const accountRow = {
  id: "acc1", tenant_id: TENANT, platform: "meta", account_id: "page123",
  account_name: "My Page", page_id: "page123", is_active: true,
  token_expires_at: null, created_at: now,
};

const postRow = {
  id: "post1", tenant_id: TENANT, social_account_id: "acc1", platform: "meta",
  content: "Hello world!", media_urls: [], status: "draft",
  scheduled_at: null, published_at: null, external_post_id: null,
  error_message: null, created_at: now,
};

describe("SaasSocialService", () => {
  it("listAccounts returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSocialService(db);
    expect(await svc.listAccounts(TENANT)).toEqual([]);
  });

  it("connectAccount validates platform", async () => {
    const db = makeDb();
    const svc = new SaasSocialService(db);
    await expect(svc.connectAccount(TENANT, {
      platform: "twitter" as "meta", accountId: "123", accountName: "test", accessToken: "tok",
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("connectAccount validates empty accountId", async () => {
    const db = makeDb();
    const svc = new SaasSocialService(db);
    await expect(svc.connectAccount(TENANT, {
      platform: "meta", accountId: "", accountName: "test", accessToken: "tok",
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("connectAccount upserts and returns account", async () => {
    const db = makeDb([[accountRow]]);
    const svc = new SaasSocialService(db);
    const account = await svc.connectAccount(TENANT, {
      platform: "meta", accountId: "page123", accountName: "My Page",
      pageId: "page123", accessToken: "tok123",
    });
    expect(account.id).toBe("acc1");
    expect(account.platform).toBe("meta");
    expect(account.isActive).toBe(true);
  });

  it("disconnectAccount throws NOT_FOUND for unknown id", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSocialService(db);
    await expect(svc.disconnectAccount(TENANT, "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("createPost validates empty content", async () => {
    const db = makeDb([[accountRow]]);
    const svc = new SaasSocialService(db);
    await expect(svc.createPost(TENANT, { socialAccountId: "acc1", content: "" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("createPost rejects inactive account", async () => {
    const db = makeDb([[]]); // no active account returned
    const svc = new SaasSocialService(db);
    await expect(svc.createPost(TENANT, { socialAccountId: "acc1", content: "Hi" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("createPost creates draft without scheduledAt", async () => {
    const db = makeDb([[accountRow], [postRow]]);
    const svc = new SaasSocialService(db);
    const post = await svc.createPost(TENANT, { socialAccountId: "acc1", content: "Hello world!" });
    expect(post.status).toBe("draft");
    expect(post.platform).toBe("meta");
  });

  it("createPost creates scheduled post with scheduledAt", async () => {
    const scheduled = { ...postRow, status: "scheduled", scheduled_at: "2026-07-01T10:00:00Z" };
    const db = makeDb([[accountRow], [scheduled]]);
    const svc = new SaasSocialService(db);
    const post = await svc.createPost(TENANT, {
      socialAccountId: "acc1", content: "Hello!", scheduledAt: "2026-07-01T10:00:00Z",
    });
    expect(post.status).toBe("scheduled");
  });

  it("publishPost to Meta returns ok:false if page_id missing", async () => {
    const postWithAccount = { ...postRow, access_token: "tok", page_id: null };
    const failedRow = { ...postRow, status: "failed", error_message: "Meta page_id not configured" };
    const db = makeDb([[postWithAccount], [failedRow]]);
    const mockFetch = vi.fn();
    const svc = new SaasSocialService(db, mockFetch as unknown as typeof fetch);
    const result = await svc.publishPost(TENANT, "post1");
    expect(result.ok).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("publishPost to Meta calls Graph API and returns ok:true", async () => {
    const postWithPage = { ...postRow, access_token: "tok", page_id: "page123" };
    const publishedRow = { ...postRow, status: "published", external_post_id: "123456789" };
    const db = makeDb([[postWithPage], [publishedRow]]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "123456789_987" }),
    });
    const svc = new SaasSocialService(db, mockFetch as unknown as typeof fetch);
    const result = await svc.publishPost(TENANT, "post1");
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect((mockFetch.mock.calls[0][0] as string)).toContain("graph.facebook.com");
  });

  it("publishPost to LinkedIn calls API and handles error gracefully", async () => {
    const linkedInPost = { ...postRow, platform: "linkedin", access_token: "tok", page_id: "urn:li:organization:123" };
    const failedRow = { ...postRow, status: "failed", error_message: "LinkedIn API: Unauthorized" };
    const db = makeDb([[linkedInPost], [failedRow]]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, statusText: "Unauthorized",
      json: async () => ({ message: "Unauthorized" }),
    });
    const svc = new SaasSocialService(db, mockFetch as unknown as typeof fetch);
    const result = await svc.publishPost(TENANT, "post1");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("LinkedIn");
  });

  it("deletePost throws NOT_FOUND for published post", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSocialService(db);
    await expect(svc.deletePost(TENANT, "post1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
