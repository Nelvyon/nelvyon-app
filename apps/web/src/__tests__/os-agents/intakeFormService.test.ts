import { describe, expect, it } from "vitest";

import { getSchemaForService, validateIntake } from "@nelvyon/os-agents";

const baseValid = {
  clientName: "Studio Norte SL",
  industry: "Tecnología",
  targetAudience: "PMEs digitales en ES",
  tone: "profesional",
  competitors: ["Comp A", "Comp B", "Comp C"],
  primaryColor: "#0f172a",
  secondaryColor: "#64748b",
  referenceUrls: ["https://example.org/ref"],
};

describe("IntakeFormService", () => {
  it("a) getSchemaForService('web_premium') includes pages and hasExistingContent", () => {
    const names = getSchemaForService("web_premium").map((f) => f.name);
    expect(names).toContain("pages");
    expect(names).toContain("hasExistingContent");
  });

  it("b) getSchemaForService('seo_premium') includes targetKeywords and mainGoal", () => {
    const names = getSchemaForService("seo_premium").map((f) => f.name);
    expect(names).toContain("targetKeywords");
    expect(names).toContain("mainGoal");
  });

  it("c) validateIntake with complete data returns valid", () => {
    const data = {
      ...baseValid,
      pages: ["home", "contacto"],
      hasExistingContent: true,
      preferredPlatform: "nextjs",
    };
    expect(validateIntake("web_premium", data)).toEqual({ valid: true, errors: {} });
  });

  it("d) validateIntake without clientName fails", () => {
    const { clientName: _omit, ...rest } = baseValid;
    void _omit;
    const r = validateIntake("web_premium", {
      ...rest,
      pages: ["home"],
      hasExistingContent: false,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.clientName).toBe("Requerido");
  });

  it("e) getSchemaForService with unknown serviceId returns base fields only", () => {
    const webNames = new Set(getSchemaForService("web_premium").map((f) => f.name));
    const unknown = getSchemaForService("unknown_custom_service");
    const unknownNames = unknown.map((f) => f.name);
    expect(unknownNames).not.toContain("pages");
    expect(unknownNames).not.toContain("targetKeywords");
    expect(unknownNames.length).toBeGreaterThan(4);
    for (const n of unknownNames) {
      expect(webNames.has(n)).toBe(true);
    }
  });
});
