import { describe, expect, it } from "vitest";

import { buildPackLibraryInternalRefs } from "@/lib/packs/packTemplateLibrary";
import { LOCAL_GROWTH_PACK_ID, SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";
import { buildBriefFromIntake } from "@/lib/packs/localBusinessGrowthPack";

describe("packTemplateLibrary", () => {
  it("attaches internal library refs without client-facing seed paths", () => {
    const refs = buildPackLibraryInternalRefs({
      pack_id: SAAS_B2B_GROWTH_PACK_ID,
      sector: "saas_b2b",
    });
    expect(refs.native_templates.landing?.id).toBeTruthy();
    expect(Object.keys(refs.saas_seeds).length).toBeGreaterThan(0);
    expect(refs.on_disk_seeds.some((s) => s.provider === "Aceternity")).toBe(true);
    for (const seed of refs.on_disk_seeds) {
      expect(seed.slug).not.toContain("source.zip");
    }
  });

  it("enriches local growth brief with template_library_internal", () => {
    const brief = buildBriefFromIntake({
      business_name: "Clínica Demo",
      sector: "dental",
      city: "Madrid",
      country: "ES",
      value_proposition: "Odontología avanzada",
      primary_cta: "Pedir cita",
      contact_email: "hola@demo.es",
      tier: "professional",
    });
    const internal = brief.template_library_internal as { pack_id: string };
    expect(internal.pack_id).toBe(LOCAL_GROWTH_PACK_ID);
    expect(brief.template_id).toBeTruthy();
  });
});
