import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaasSnippetsService } from "../SaasSnippetsService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-a";
const USER = "user-1";

describe("SaasSnippetsService", () => {
  it("list returns empty array when no snippets", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSnippetsService(db);
    const result = await svc.list(TENANT);
    expect(result).toEqual([]);
  });

  it("create validates empty name", async () => {
    const db = makeDb();
    const svc = new SaasSnippetsService(db);
    await expect(svc.create(TENANT, USER, { name: "  ", content: "hello" })).rejects.toThrow("name is required");
  });

  it("create validates empty content", async () => {
    const db = makeDb();
    const svc = new SaasSnippetsService(db);
    await expect(svc.create(TENANT, USER, { name: "Hi", content: "" })).rejects.toThrow("content is required");
  });

  it("create inserts and returns snippet", async () => {
    const row = {
      id: "s1", tenant_id: TENANT, name: "Hi", shortcut: "/hi",
      content: "Hello there!", channels: ["email"], variables: [],
      created_by: USER, created_at: new Date(), updated_at: new Date(),
    };
    const db = makeDb([[row]]);
    const svc = new SaasSnippetsService(db);
    const snippet = await svc.create(TENANT, USER, { name: "Hi", shortcut: "/hi", content: "Hello there!", channels: ["email"] });
    expect(snippet.id).toBe("s1");
    expect(snippet.name).toBe("Hi");
    expect(snippet.channels).toEqual(["email"]);
  });

  it("delete throws NOT_FOUND for missing snippet", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSnippetsService(db);
    await expect(svc.delete(TENANT, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
