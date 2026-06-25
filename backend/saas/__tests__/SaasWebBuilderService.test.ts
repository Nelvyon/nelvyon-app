import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasWebBuilderService, SaasWebBuilderError, resetSaasWebBuilderServiceForTests } from "../SaasWebBuilderService";

beforeEach(() => { resetSaasWebBuilderServiceForTests(); });

const heroSection = { id: "s1", type: "hero", content: { headline: "H", subtitle: "", ctaLabel: "Go", ctaUrl: "#" } };

const pageRow = {
  id: "p1", tenant_id: "t1", title: "My Landing", slug: "my-landing",
  type: "landing", status: "draft",
  sections: [heroSection],
  seo_title: null, seo_description: null, published_html: null, cdn_url: null,
  views: 0, published_at: null, custom_domain: null,
  domain_status: "none", domain_verified_at: null, ssl_status: "pending", ssl_verified_at: null,
  created_at: new Date(), updated_at: new Date(),
};

function makeDb(pages: unknown[] = []) {
  return {
    query: vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM saas_tenants")) return [{ subdomain: "demo", slug: "demo" }];
      if (sql.includes("FROM saas_web_pages")) return pages;
      if (sql.includes("INSERT INTO saas_web_pages")) return [pageRow];
      if (sql.includes("UPDATE saas_web_pages") && sql.includes("status='published'")) {
        return pages.length ? [{ ...pageRow, status: "published", published_at: new Date(), published_html: "<!DOCTYPE html>", cdn_url: "https://pages.nelvyon.com/demo/my-landing" }] : [];
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

describe("SaasWebBuilderService.renderHtml", () => {
  function makePage(sections: unknown[]) {
    const svc = new SaasWebBuilderService(makeDb() as never);
    return svc.renderHtml({
      id: "p1", tenantId: "t1", title: "Test Page", slug: "test",
      type: "landing", status: "published", sections: sections as never,
      views: 0, publishedAt: null, customDomain: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  it("renders <!DOCTYPE html> wrapper", () => {
    const html = makePage([]);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Test Page</title>");
  });

  it("renders hero section with headline and CTA", () => {
    const html = makePage([{
      id: "h1", type: "hero",
      content: { headline: "Bienvenido", subtitle: "Subtitulo", ctaLabel: "Empezar", ctaUrl: "/start" },
    }]);
    expect(html).toContain("Bienvenido");
    expect(html).toContain("Subtitulo");
    expect(html).toContain("Empezar");
    expect(html).toContain("/start");
  });

  it("renders text section", () => {
    const html = makePage([{
      id: "t1", type: "text",
      content: { heading: "¿Quiénes somos?", body: "Somos una agencia." },
    }]);
    expect(html).toContain("¿Quiénes somos?");
    expect(html).toContain("Somos una agencia.");
  });

  it("renders features section with items", () => {
    const html = makePage([{
      id: "f1", type: "features",
      content: { heading: "Ventajas", items: [{ icon: "✅", title: "Rápido", desc: "Muy rápido" }] },
    }]);
    expect(html).toContain("Ventajas");
    expect(html).toContain("Rápido");
    expect(html).toContain("Muy rápido");
  });

  it("escapes HTML special characters", () => {
    const html = makePage([{
      id: "x1", type: "text",
      content: { heading: "<script>alert(1)</script>", body: "" },
    }]);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("SaasWebBuilderService customDomain", () => {
  it("stores customDomain on create and returns it", async () => {
    const rowWithDomain = { ...pageRow, custom_domain: "landing.example.com" };
    const db = { query: vi.fn().mockResolvedValue([rowWithDomain]) };
    const svc = new SaasWebBuilderService(db as never);
    const page = await svc.create("t1", { title: "X", customDomain: "landing.example.com" });
    expect(page.customDomain).toBe("landing.example.com");
    const call = db.query.mock.calls[0];
    expect(call[1]).toContain("landing.example.com");
  });

  it("returns null customDomain when not set", async () => {
    const db = { query: vi.fn().mockResolvedValue([{ ...pageRow, custom_domain: null }]) };
    const svc = new SaasWebBuilderService(db as never);
    const page = await svc.create("t1", { title: "X" });
    expect(page.customDomain).toBeNull();
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
