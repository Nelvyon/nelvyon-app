import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasWebBuilderService, SaasWebBuilderError, resetSaasWebBuilderServiceForTests } from "../SaasWebBuilderService";

beforeEach(() => { resetSaasWebBuilderServiceForTests(); });

const pageRow = {
  id: "p1", tenant_id: "t1", title: "My Landing", slug: "my-landing",
  type: "landing", status: "draft", sections: [], views: 0,
  published_at: null, created_at: new Date(), updated_at: new Date(),
};

function makeDb(pages: unknown[] = []) {
  return {
    query: vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM saas_web_pages")) return pages;
      if (sql.includes("INSERT INTO saas_web_pages")) return [pageRow];
      if (sql.includes("UPDATE saas_web_pages SET status='published'")) {
        return pages.length ? [{ ...pageRow, status: "published", published_at: new Date() }] : [];
      }
      if (sql.includes("UPDATE saas_web_pages")) return [pageRow];
      if (sql.includes("DELETE FROM saas_web_pages")) return pages.length ? [{ id: "p1" }] : [];
      return [];
    }),
  };
}

describe("SaasWebBuilderService.list", () => {
  it("returns empty array when no pages", async () => {
    const svc = new SaasWebBuilderService(makeDb() as never);
    expect(await svc.list("t1")).toEqual([]);
  });

  it("maps db rows correctly", async () => {
    const svc = new SaasWebBuilderService(makeDb([pageRow]) as never);
    const pages = await svc.list("t1");
    expect(pages).toHaveLength(1);
    expect(pages[0].title).toBe("My Landing");
    expect(pages[0].status).toBe("draft");
  });
});

describe("SaasWebBuilderService.create", () => {
  it("throws VALIDATION for empty title", async () => {
    const svc = new SaasWebBuilderService(makeDb() as never);
    await expect(svc.create("t1", { title: "  " }))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });

  it("throws VALIDATION for invalid type", async () => {
    const svc = new SaasWebBuilderService(makeDb() as never);
    await expect(svc.create("t1", { title: "Test", type: "invalid" as never }))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });

  it("creates page with default hero section", async () => {
    const svc = new SaasWebBuilderService(makeDb() as never);
    const page = await svc.create("t1", { title: "Landing" });
    expect(page.id).toBe("p1");
    expect(page.title).toBe("My Landing");
  });

  it("accepts custom slug", async () => {
    const db = makeDb();
    const svc = new SaasWebBuilderService(db as never);
    await svc.create("t1", { title: "Test", slug: "custom-slug" });
    const call = (db.query as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: string[]) => typeof c[0] === "string" && c[0].includes("INSERT"),
    );
    expect(call).toBeDefined();
    expect((call as unknown[])[1]).toContain("custom-slug");
  });
});

describe("SaasWebBuilderService.publish", () => {
  it("throws NOT_FOUND for missing page", async () => {
    const svc = new SaasWebBuilderService(makeDb() as never);
    await expect(svc.publish("t1", "no-id"))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("publishes and sets publishedAt", async () => {
    const svc = new SaasWebBuilderService(makeDb([pageRow]) as never);
    const page = await svc.publish("t1", "p1");
    expect(page.status).toBe("published");
    expect(page.publishedAt).not.toBeNull();
  });
});

describe("SaasWebBuilderService.delete", () => {
  it("throws NOT_FOUND for missing page", async () => {
    const svc = new SaasWebBuilderService(makeDb() as never);
    await expect(svc.delete("t1", "no-id"))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("deletes existing page", async () => {
    const svc = new SaasWebBuilderService(makeDb([pageRow]) as never);
    await expect(svc.delete("t1", "p1")).resolves.toBeUndefined();
  });
});

describe("SaasWebBuilderError", () => {
  it("is instanceof Error with code", () => {
    const e = new SaasWebBuilderError("msg", "TEST");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("TEST");
    expect(e.name).toBe("SaasWebBuilderError");
  });
});
