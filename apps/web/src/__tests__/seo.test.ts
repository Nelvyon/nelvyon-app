import type { MetadataRoute } from "next";
import { afterEach, describe, expect, it, vi } from "vitest";

function pathsFromSitemap(entries: MetadataRoute.Sitemap): string[] {
  return entries.map((e) => new URL(e.url).pathname);
}

function collectDisallow(robots: MetadataRoute.Robots): string[] {
  const rules = robots.rules;
  const list = Array.isArray(rules) ? rules : rules ? [rules] : [];
  const out: string[] = [];
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const d = (r as { disallow?: string | string[] }).disallow;
    if (typeof d === "string") out.push(d);
    else if (Array.isArray(d)) out.push(...d);
  }
  return out;
}

describe("SEO (MIG 287)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("sitemap incluye rutas estáticas esperadas", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://seo-sitemap.test");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    const paths = pathsFromSitemap(entries);
    expect(paths).toContain("/");
    expect(paths).toContain("/pricing");
    expect(paths).toContain("/legal");
    expect(paths).toContain("/legal/privacy");
    expect(paths).toContain("/legal/terms");
    expect(entries.every((e) => new URL(e.url).origin === "https://seo-sitemap.test")).toBe(true);
  });

  it("robots permite / y disallow dashboard, api y admin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://seo-robots.test");
    const { default: robots } = await import("@/app/robots");
    const r = robots();
    expect(r.sitemap).toBe("https://seo-robots.test/sitemap.xml");
    const disallow = collectDisallow(r);
    expect(disallow).toContain("/dashboard");
    expect(disallow).toContain("/api");
    expect(disallow).toContain("/admin");
  });

  it(
    "metadata del layout (modo internal) define title y description",
    async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://seo-meta.test");
    vi.stubEnv("NEXT_PUBLIC_BRAND_MODE", "internal");
    const { metadata } = await import("@/app/site-metadata");
    expect(metadata).toBeDefined();
    expect(metadata && "title" in metadata && metadata.title).toBeTruthy();
    const title = metadata?.title;
    if (title && typeof title === "object" && "default" in title) {
      expect(String((title as { default: string }).default)).toContain("NELVYON");
    }
    expect(typeof metadata?.description).toBe("string");
    expect(String(metadata?.description).length).toBeGreaterThan(10);
    },
    15_000,
  );
});
