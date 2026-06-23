import { describe, expect, it } from "vitest";

import {
  getClientDeliverableTemplate,
  getTemplateLibraryStats,
  listTemplates,
  resolvePackTemplateBundle,
  resolveTemplate,
} from "../registry";

describe("template-library registry", () => {
  it("has client-facing templates across core kinds", () => {
    const stats = getTemplateLibraryStats();
    expect(stats.client_facing).toBeGreaterThan(40);
    expect(stats.landings).toBeGreaterThanOrEqual(15);
    expect(stats.blocks).toBeGreaterThanOrEqual(20);
    expect(stats.funnels).toBeGreaterThanOrEqual(5);
    expect(stats.email_sequences).toBeGreaterThanOrEqual(5);
  });

  it("resolves landing for restaurant sector", () => {
    const result = resolveTemplate({
      service: "landing",
      kind: "landing",
      sector: "restaurant",
      pack_id: "local-business-growth",
    });
    expect(result?.template.id).toBe("landing-restaurant-reservas-v1");
  });

  it("resolves pack bundle for local growth", () => {
    const bundle = resolvePackTemplateBundle({
      pack_id: "local-business-growth",
      sector: "dental",
    });
    expect(bundle.landing?.id).toContain("dental");
    expect(bundle.email_sequence).toBeTruthy();
  });

  it("blocks seed-only templates from client delivery", () => {
    expect(() => getClientDeliverableTemplate("aceternity-foxtrot")).toThrow(/seed-only|cannot be delivered/i);
  });

  it("filters by service and tag", () => {
    const ads = listTemplates({ service: "ads", kind: "ad_creative", status: "active" });
    expect(ads.length).toBeGreaterThanOrEqual(5);
    expect(ads.every((t) => t.nelvyon_owned)).toBe(true);
  });
});
