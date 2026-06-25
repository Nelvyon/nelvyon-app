/**
 * S37 — Web Builder depth tests: sections, versions, domain verify, publish v2, public access
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasWebBuilderService, SaasWebBuilderError, resetSaasWebBuilderServiceForTests } from "../SaasWebBuilderService";

beforeEach(() => { resetSaasWebBuilderServiceForTests(); vi.restoreAllMocks(); });

// ── Fixtures ──────────────────────────────────────────────────────────────────

const s1 = { id: "sec-1", type: "hero", content: { headline: "H1", subtitle: "S1", ctaLabel: "Go", ctaUrl: "#" } };
const s2 = { id: "sec-2", type: "text", content: { heading: "T", body: "B" } };
const s3 = { id: "sec-3", type: "cta", content: { heading: "CTA", ctaLabel: "Click", ctaUrl: "#" } };

const pageRow = {
  id: "p1", tenant_id: "t1", title: "Test Page", slug: "test-page", type: "landing",
  status: "draft", sections: [s1, s2], seo_title: null, seo_description: null,
  published_html: null, cdn_url: null, views: 10, published_at: null,
  custom_domain: null, domain_status: "none", domain_verified_at: null,
  ssl_status: "pending", ssl_verified_at: null, created_at: new Date(), updated_at: new Date(),
};

const versionRow = {
  id: "v1", page_id: "p1", version: 1, sections: [s1, s2], created_at: new Date(),
};

function makeDb(overrides: Record<string, unknown[]> = {}) {
  const data = {
    pages: [pageRow] as unknown[],
    versions: [] as unknown[],
    tenants: [{ subdomain: "myco", slug: "myco" }] as unknown[],
    ...overrides,
  };
  return {
    query: vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM saas_web_page_versions") && sql.includes("MAX(version)")) {
        return data.versions.length
          ? [{ max: Math.max(...(data.versions as { version: number }[]).map(v => v.version)) }]
          : [{ max: null }];
      }
      if (sql.includes("INSERT INTO saas_web_page_versions")) return [versionRow];
      if (sql.includes("FROM saas_web_page_versions") && sql.includes("WHERE id=")) return data.versions;
      if (sql.includes("FROM saas_web_page_versions")) return data.versions;
      if (sql.includes("FROM saas_tenants")) return data.tenants;
      if (sql.includes("INSERT INTO saas_web_pages")) return [pageRow];
      if (sql.includes("UPDATE saas_web_pages") && sql.includes("status='published'")) {
        return data.pages.length ? [{ ...pageRow, status: "published", published_html: "<!DOCTYPE html>", cdn_url: "https://pages.nelvyon.com/myco/test-page", published_at: new Date() }] : [];
      }
      if (sql.includes("UPDATE saas_web_pages") && sql.includes("status='draft'")) {
        return data.pages.length ? [{ ...pageRow, status: "draft" }] : [];
      }
      if (sql.includes("UPDATE saas_web_pages") && sql.includes("domain_status='verified'")) return [];
      if (sql.includes("UPDATE saas_web_pages") && sql.includes("domain_status='pending'")) return [];
      if (sql.includes("UPDATE saas_web_pages") && sql.includes("domain_status='failed'")) return [];
      if (sql.includes("UPDATE saas_web_pages") && sql.includes("ssl_status='active'")) return [];
      if (sql.includes("UPDATE saas_web_pages")) return [];
      if (sql.includes("DELETE FROM saas_web_pages")) return data.pages.length ? [{ id: "p1" }] : [];
      if (sql.includes("FROM saas_web_pages") && sql.includes("custom_domain=$1")) return data.pages;
      if (sql.includes("FROM saas_web_pages") && sql.includes("id=$2")) return data.pages;
      if (sql.includes("FROM saas_web_pages") && sql.includes("JOIN saas_tenants")) return data.pages;
      if (sql.includes("FROM saas_web_pages")) return data.pages;
      if (sql.includes("UPDATE saas_web_pages p") && sql.includes("views")) return [];
      return [];
    }),
  };
}

// ── reorderSections ───────────────────────────────────────────────────────────

describe("SaasWebBuilderService.reorderSections", () => {
  it("reorders sections by ID array", async () => {
    const db = makeDb({ pages: [{ ...pageRow, sections: [s1, s2] }] });
    const svc = new SaasWebBuilderService(db as never);
    await svc.reorderSections("t1", "p1", ["sec-2", "sec-1"]);
    const updateCall = db.query.mock.calls.find((c: [string]) => c[0].includes("UPDATE saas_web_pages") && c[0].includes("sections"));
    expect(updateCall).toBeDefined();
  });

  it("throws VALIDATION when IDs don't match existing sections", async () => {
    const db = makeDb({ pages: [{ ...pageRow, sections: [s1, s2] }] });
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.reorderSections("t1", "p1", ["sec-1", "sec-WRONG"]))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });

  it("throws VALIDATION when count mismatches", async () => {
    const db = makeDb({ pages: [{ ...pageRow, sections: [s1, s2] }] });
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.reorderSections("t1", "p1", ["sec-1"]))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });
});

// ── addSection ────────────────────────────────────────────────────────────────

describe("SaasWebBuilderService.addSection", () => {
  it("adds a hero section to the end", async () => {
    const db = makeDb();
    const svc = new SaasWebBuilderService(db as never);
    await svc.addSection("t1", "p1", { type: "hero" });
    const updateCall = db.query.mock.calls.find((c: [string]) => c[0].includes("UPDATE saas_web_pages") && c[0].includes("sections"));
    expect(updateCall).toBeDefined();
    const sectionsParam = (updateCall![1] as string[])[2];
    const sections = JSON.parse(sectionsParam) as { type: string }[];
    expect(sections.some(s => s.type === "hero")).toBe(true);
  });

  it("inserts at specified index", async () => {
    const db = makeDb({ pages: [{ ...pageRow, sections: [s1, s3] }] });
    const svc = new SaasWebBuilderService(db as never);
    await svc.addSection("t1", "p1", { type: "text", atIndex: 1 });
    const updateCall = db.query.mock.calls.find((c: [string]) => c[0].includes("UPDATE saas_web_pages") && c[0].includes("sections"));
    const sectionsParam = (updateCall![1] as string[])[2];
    const sections = JSON.parse(sectionsParam) as { type: string }[];
    expect(sections[1]!.type).toBe("text");
  });

  it("throws VALIDATION for invalid section type", async () => {
    const db = makeDb();
    const svc = new SaasWebBuilderService(db as never);
    // @ts-expect-error testing invalid type
    await expect(svc.addSection("t1", "p1", { type: "invalid" }))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });

  it("throws NOT_FOUND for non-existent page", async () => {
    const db = makeDb({ pages: [] });
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.addSection("t1", "p-missing", { type: "hero" }))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });
});

// ── deleteSection ─────────────────────────────────────────────────────────────

describe("SaasWebBuilderService.deleteSection", () => {
  it("removes a section by id", async () => {
    const db = makeDb({ pages: [{ ...pageRow, sections: [s1, s2, s3] }] });
    const svc = new SaasWebBuilderService(db as never);
    await svc.deleteSection("t1", "p1", "sec-2");
    const updateCall = db.query.mock.calls.find((c: [string]) => c[0].includes("UPDATE saas_web_pages") && c[0].includes("sections"));
    const sections = JSON.parse((updateCall![1] as string[])[2]) as { id: string }[];
    expect(sections.find(s => s.id === "sec-2")).toBeUndefined();
    expect(sections).toHaveLength(2);
  });

  it("throws NOT_FOUND for missing section id", async () => {
    const db = makeDb();
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.deleteSection("t1", "p1", "no-such-section"))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });
});

// ── saveVersion / listVersions / restoreVersion ────────────────────────────────

describe("SaasWebBuilderService.saveVersion", () => {
  it("inserts version with next version number", async () => {
    const db = makeDb({ versions: [{ ...versionRow, version: 2 }] });
    const svc = new SaasWebBuilderService(db as never);
    await svc.saveVersion("t1", "p1");
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO saas_web_page_versions"),
      expect.arrayContaining([3]),
    );
  });

  it("starts at version 1 when no prior versions", async () => {
    const db = makeDb({ versions: [] });
    const svc = new SaasWebBuilderService(db as never);
    await svc.saveVersion("t1", "p1");
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO saas_web_page_versions"),
      expect.arrayContaining([1]),
    );
  });

  it("throws NOT_FOUND for missing page", async () => {
    const db = makeDb({ pages: [] });
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.saveVersion("t1", "p-missing"))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });
});

describe("SaasWebBuilderService.listVersions", () => {
  it("returns all versions in DESC order", async () => {
    const v2 = { ...versionRow, id: "v2", version: 2 };
    const db = makeDb({ versions: [v2, versionRow] });
    const svc = new SaasWebBuilderService(db as never);
    const versions = await svc.listVersions("t1", "p1");
    expect(versions).toHaveLength(2);
  });

  it("returns empty array when no versions", async () => {
    const db = makeDb({ versions: [] });
    const svc = new SaasWebBuilderService(db as never);
    const versions = await svc.listVersions("t1", "p1");
    expect(versions).toEqual([]);
  });
});

describe("SaasWebBuilderService.restoreVersion", () => {
  it("restores sections from version", async () => {
    const db = makeDb({ versions: [versionRow] });
    const svc = new SaasWebBuilderService(db as never);
    await svc.restoreVersion("t1", "p1", "v1");
    const updateCall = db.query.mock.calls.find((c: [string]) =>
      c[0].includes("UPDATE saas_web_pages") && c[0].includes("sections"),
    );
    expect(updateCall).toBeDefined();
  });

  it("throws NOT_FOUND when version doesn't exist", async () => {
    const db = makeDb({ versions: [] });
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.restoreVersion("t1", "p1", "no-version"))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });
});

// ── verifyCustomDomain ────────────────────────────────────────────────────────

describe("SaasWebBuilderService.verifyCustomDomain", () => {
  it("marks verified when CNAME points to pages.nelvyon.com", async () => {
    const db = makeDb({ pages: [{ ...pageRow, custom_domain: "mysite.com" }] });
    const svc = new SaasWebBuilderService(db as never);
    // Mock dns
    const dnsMod = await import("dns");
    vi.spyOn(dnsMod.promises, "resolveCname").mockResolvedValueOnce(["pages.nelvyon.com"]);
    const result = await svc.verifyCustomDomain("t1", "p1");
    expect(result.ok).toBe(true);
    expect(result.domainStatus).toBe("verified");
  });

  it("marks failed when CNAME points elsewhere", async () => {
    const db = makeDb({ pages: [{ ...pageRow, custom_domain: "mysite.com" }] });
    const svc = new SaasWebBuilderService(db as never);
    const dnsMod = await import("dns");
    vi.spyOn(dnsMod.promises, "resolveCname").mockResolvedValueOnce(["other-host.com"]);
    const result = await svc.verifyCustomDomain("t1", "p1");
    expect(result.ok).toBe(false);
    expect(result.domainStatus).toBe("failed");
  });

  it("marks failed on DNS lookup error", async () => {
    const db = makeDb({ pages: [{ ...pageRow, custom_domain: "mysite.com" }] });
    const svc = new SaasWebBuilderService(db as never);
    const dnsMod = await import("dns");
    vi.spyOn(dnsMod.promises, "resolveCname").mockRejectedValueOnce(new Error("ENOTFOUND"));
    const result = await svc.verifyCustomDomain("t1", "p1");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("DNS lookup failed");
  });

  it("throws VALIDATION when no custom domain configured", async () => {
    const db = makeDb({ pages: [{ ...pageRow, custom_domain: null }] });
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.verifyCustomDomain("t1", "p1"))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });
});

// ── publish v2 ────────────────────────────────────────────────────────────────

describe("SaasWebBuilderService.publish v2", () => {
  it("throws VALIDATION when page has no sections", async () => {
    const db = makeDb({ pages: [{ ...pageRow, sections: [] }] });
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.publish("t1", "p1"))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });

  it("stores published_html and cdn_url", async () => {
    const db = makeDb({ pages: [{ ...pageRow, sections: [s1] }] });
    const svc = new SaasWebBuilderService(db as never);
    const page = await svc.publish("t1", "p1");
    expect(page.status).toBe("published");
    expect(page.cdnUrl).toContain("pages.nelvyon.com");
  });

  it("generates cdn_url with tenant subdomain", async () => {
    const db = makeDb({ pages: [{ ...pageRow, sections: [s1] }], tenants: [{ subdomain: "acme", slug: "acme" }] });
    const svc = new SaasWebBuilderService(db as never);
    const page = await svc.publish("t1", "p1");
    expect(page.cdnUrl).toBeDefined();
  });
});

// ── getPublicPage / getPublicPageByDomain ─────────────────────────────────────

describe("SaasWebBuilderService.getPublicPage", () => {
  it("returns null for unknown subdomain/slug", async () => {
    const db = makeDb({ pages: [] });
    const svc = new SaasWebBuilderService(db as never);
    const r = await svc.getPublicPage("unknown", "some-slug");
    expect(r).toBeNull();
  });

  it("returns page for valid subdomain+slug", async () => {
    const db = makeDb({ pages: [{ ...pageRow, status: "published" }] });
    const svc = new SaasWebBuilderService(db as never);
    const r = await svc.getPublicPage("myco", "test-page");
    expect(r).not.toBeNull();
  });

  it("uses JOIN on saas_tenants", async () => {
    const db = makeDb({ pages: [{ ...pageRow, status: "published" }] });
    const svc = new SaasWebBuilderService(db as never);
    await svc.getPublicPage("myco", "test-page");
    const joinCall = db.query.mock.calls.find((c: [string]) =>
      c[0].includes("JOIN saas_tenants"),
    );
    expect(joinCall).toBeDefined();
  });
});

describe("SaasWebBuilderService.getPublicPageByDomain", () => {
  it("returns null for unverified domain", async () => {
    const db = makeDb({ pages: [] });
    const svc = new SaasWebBuilderService(db as never);
    const r = await svc.getPublicPageByDomain("unknown.com");
    expect(r).toBeNull();
  });

  it("returns page for verified domain", async () => {
    const db = makeDb({ pages: [{ ...pageRow, status: "published", custom_domain: "mysite.com", domain_status: "verified" }] });
    const svc = new SaasWebBuilderService(db as never);
    const r = await svc.getPublicPageByDomain("mysite.com");
    expect(r).not.toBeNull();
  });
});

// ── recordView ────────────────────────────────────────────────────────────────

describe("SaasWebBuilderService.recordView", () => {
  it("executes atomic views++ UPDATE", async () => {
    const db = makeDb();
    const svc = new SaasWebBuilderService(db as never);
    await svc.recordView("myco", "test-page");
    const updateCall = db.query.mock.calls.find((c: [string]) =>
      c[0].includes("views") && c[0].includes("UPDATE"),
    );
    expect(updateCall).toBeDefined();
  });

  it("does not throw even for unknown slug", async () => {
    const db = makeDb();
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.recordView("no-tenant", "no-slug")).resolves.not.toThrow();
  });
});

// ── unpublish ─────────────────────────────────────────────────────────────────

describe("SaasWebBuilderService.unpublish", () => {
  it("sets status back to draft", async () => {
    const db = makeDb({ pages: [{ ...pageRow, status: "published" }] });
    const svc = new SaasWebBuilderService(db as never);
    const page = await svc.unpublish("t1", "p1");
    expect(page.status).toBe("draft");
  });

  it("throws NOT_FOUND for missing page", async () => {
    const db = makeDb({ pages: [] });
    const svc = new SaasWebBuilderService(db as never);
    await expect(svc.unpublish("t1", "p-missing"))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });
});

// ── renderHtml section types ──────────────────────────────────────────────────

describe("SaasWebBuilderService.renderHtml", () => {
  it("renders all section types without throwing", () => {
    const db = makeDb();
    const svc = new SaasWebBuilderService(db as never);
    const page = {
      id: "p1", tenantId: "t1", title: "Test", slug: "test", type: "landing" as const,
      status: "draft" as const, seoTitle: "SEO Title", seoDescription: "SEO desc",
      publishedHtml: null, cdnUrl: null, views: 0, publishedAt: null,
      customDomain: null, domainStatus: "none" as const, domainVerifiedAt: null,
      sslStatus: "pending" as const, sslVerifiedAt: null,
      updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      sections: [
        { id: "1", type: "hero" as const, content: { headline: "H", subtitle: "S", ctaLabel: "Go", ctaUrl: "#" } },
        { id: "2", type: "text" as const, content: { heading: "Heading", body: "Body text" } },
        { id: "3", type: "features" as const, content: { heading: "Features", items: [{ icon: "⭐", title: "F1", desc: "D1" }] } },
        { id: "4", type: "cta" as const, content: { heading: "CTA", body: "Body", ctaLabel: "Click", ctaUrl: "#" } },
        { id: "5", type: "contact" as const, content: { heading: "Contact", ctaLabel: "Send" } },
        { id: "6", type: "image" as const, content: { src: "https://img.com/a.jpg", alt: "img" } },
        { id: "7", type: "video" as const, content: { src: "https://vid.com/v.mp4" } },
      ],
    };
    const html = svc.renderHtml(page);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("SEO Title");
    expect(html).toContain("SEO desc");
    expect(html).toContain("section-hero");
    expect(html).toContain("Features");
    expect(html).toContain("Contact");
  });
});
