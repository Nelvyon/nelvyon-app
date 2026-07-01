import { describe, expect, it } from "vitest";
import {
  buildFeaturedTemplateSections,
  getFeaturedEnvatoTemplate,
  listFeaturedEnvatoTemplates,
} from "../featuredEnvatoTemplate";

describe("featuredEnvatoTemplate", () => {
  it("loads Landrick featured template metadata", () => {
    const t = getFeaturedEnvatoTemplate();
    expect(t.id).toBe("nelvyon-landrick-saas");
    expect(t.envato_id).toBe("59963825");
    expect(t.preview_url).toContain("envatousercontent.com");
  });

  it("lists featured Envato templates catalog", () => {
    const list = listFeaturedEnvatoTemplates();
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.some((t) => t.id === "nelvyon-landrick-saas")).toBe(true);
  });

  it("builds premium sections with company name", () => {
    const sections = buildFeaturedTemplateSections("nelvyon-landrick-saas", "Acme Corp");
    expect(sections.length).toBeGreaterThanOrEqual(6);
    const hero = sections.find((s) => s.type === "hero");
    expect(hero?.content.headline).toContain("Acme Corp");
    expect(hero?.content.stats).toBeDefined();
  });

  it("rejects unknown template id", () => {
    expect(() => buildFeaturedTemplateSections("unknown")).toThrow();
  });
});
