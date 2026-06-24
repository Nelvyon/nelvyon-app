import { describe, expect, it } from "vitest";
import { applyTemplate, getTemplate, personalizeForSector } from "@/lib/packs/packSeedTemplates";

describe("packSeedTemplates — personalizeForSector", () => {
  const intake = {
    business_name: "Restaurante El Rincón",
    city: "Barcelona",
    value_proposition: "Cocina mediterránea con ingredientes locales",
    primary_cta: "Reservar mesa",
  };

  it("returns non-null for known sector", () => {
    const result = personalizeForSector("restaurantes", intake);
    expect(result).not.toBeNull();
    expect(result!.personalized).toBe(true);
    expect(result!.sector_id).toBe("restaurantes");
  });

  it("interpolates business_name into headline", () => {
    const tpl = getTemplate("restaurantes")!;
    // headline has {{city}} placeholder, not business_name, but meta_title has business_name
    const applied = applyTemplate(tpl, intake);
    expect(applied.meta_title).toContain("Restaurante El Rincón");
  });

  it("interpolates city into headline", () => {
    const result = personalizeForSector("restaurantes", intake);
    expect(result!.landing_headline).toContain("Barcelona");
  });

  it("returns null for unknown sector", () => {
    const result = personalizeForSector("unknown-sector-xyz", intake);
    expect(result).toBeNull();
  });

  it("works for ecommerce sector", () => {
    const result = personalizeForSector("ecommerce", {
      business_name: "TiendaOnline",
      value_proposition: "Electrónica de calidad",
    });
    expect(result).not.toBeNull();
    expect(result!.landing_headline).toContain("España");
  });

  it("works for saasb2b sector", () => {
    const result = personalizeForSector("saasb2b", {
      business_name: "CRM Pro",
      value_proposition: "Automatiza tu pipeline de ventas B2B",
    });
    expect(result).not.toBeNull();
    // saasb2b headline interpolates {{value_proposition}}, not business_name
    expect(result!.landing_headline).toContain("Automatiza tu pipeline de ventas B2B");
    // but meta_title includes business_name
    expect(result!.meta_title).toContain("CRM Pro");
  });

  it("falls back to 'tu ciudad' if city not provided", () => {
    const result = personalizeForSector("restaurantes", {
      business_name: "Test Biz",
    });
    expect(result!.landing_headline).toContain("tu ciudad");
  });

  it("chatbot_greeting includes business_name", () => {
    const result = personalizeForSector("restaurantes", intake);
    expect(result!.chatbot_greeting).toContain("Restaurante El Rincón");
  });

  it("blog_h1_ideas are an array with at least 1 entry", () => {
    const result = personalizeForSector("consultoria", intake);
    expect(result).not.toBeNull();
    expect(result!.blog_h1_ideas.length).toBeGreaterThan(0);
  });
});
