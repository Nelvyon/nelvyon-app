import { describe, expect, it } from "vitest";

import { personalizeSeedLanding } from "../seed-personalizer";
import { selectSeedForPack } from "../seed-selector";

describe("seed-selector", () => {
  it("selects a curated seed for restaurant local pack", () => {
    const result = selectSeedForPack({
      pack_id: "local-business-growth",
      sector: "restaurant",
      kind: "landing",
    });
    expect(result.catalog_item_name).toBeTruthy();
    expect(result.sector_group).toBe("food_hospitality");
    expect(result.shell_id).toBeTruthy();
  });

  it("selects saas shell for saas_b2b sector", () => {
    const result = selectSeedForPack({
      pack_id: "saas-b2b-growth",
      sector: "saas_b2b",
      kind: "landing",
    });
    expect(result.sector_group).toBe("saas_tech");
    expect(result.shell_id).toBe("saas-b2b-landing");
  });

  it("varies seed per client varietyKey", () => {
    const a = selectSeedForPack({
      pack_id: "local-business-growth",
      sector: "restaurant",
      varietyKey: "client-a",
    });
    const b = selectSeedForPack({
      pack_id: "local-business-growth",
      sector: "restaurant",
      varietyKey: "client-b",
    });
    expect(a.catalog_item_name).not.toBe(b.catalog_item_name);
  });
});

describe("seed-personalizer", () => {
  it("personalizes local restaurant landing with client data", () => {
    const result = personalizeSeedLanding({
      pack_id: "local-business-growth",
      sector: "restaurant",
      business_name: "Restaurante La Plaza",
      city: "Madrid",
      value_proposition: "Cocina de mercado en el centro",
      primary_cta: "Reservar mesa",
      contact_email: "hola@laplaza.es",
    });
    expect(result.html).toContain("Restaurante La Plaza");
    expect(result.html).toContain("Reservar mesa");
    expect(result.html).toContain("Madrid");
    expect(result.html).not.toContain("{{business_name}}");
    expect(result.tokens_applied).toContain("business_name");
  });

  it("personalizes saas landing with ICP fields", () => {
    const result = personalizeSeedLanding({
      pack_id: "saas-b2b-growth",
      sector: "saas_b2b",
      business_name: "FlowMetrics",
      value_proposition: "Analytics en tiempo real",
      primary_cta: "Solicitar demo",
      icp_title: "VP Product",
      sales_motion: "plg",
      pricing_model: "subscription",
    });
    expect(result.html).toContain("FlowMetrics");
    expect(result.html).toContain("VP Product");
    expect(result.selection.shell_id).toBe("saas-b2b-landing");
  });
});
