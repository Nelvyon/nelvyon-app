import { describe, it, expect } from "vitest";
import {
  validateBetaPackIntake,
  validateSocialCalendarIntake,
  validateContentStrategyIntake,
  validateCroAuditIntake,
  validateAnalyticsSetupIntake,
  validateBrandVoiceIntake,
} from "../betaPacksRunners";

const VALID_BASE = {
  business_name: "Test Biz",
  city: "Madrid",
  value_proposition: "Best product ever",
  primary_cta: "Contactar",
  sector: "local",
};

describe("validateBetaPackIntake", () => {
  it("returns intake when all required fields present", () => {
    const result = validateBetaPackIntake(VALID_BASE, ["local", "ecommerce"]);
    expect(result).not.toBeNull();
    expect(result?.business_name).toBe("Test Biz");
    expect(result?.sector).toBe("local");
  });

  it("returns null when business_name missing", () => {
    const { business_name: _, ...rest } = VALID_BASE;
    expect(validateBetaPackIntake({ ...rest, business_name: "" }, ["local"])).toBeNull();
  });

  it("returns null when city missing", () => {
    expect(validateBetaPackIntake({ ...VALID_BASE, city: "" }, ["local"])).toBeNull();
  });

  it("returns null when value_proposition missing", () => {
    expect(validateBetaPackIntake({ ...VALID_BASE, value_proposition: "" }, ["local"])).toBeNull();
  });

  it("returns null when primary_cta missing", () => {
    expect(validateBetaPackIntake({ ...VALID_BASE, primary_cta: "" }, ["local"])).toBeNull();
  });

  it("falls back to first valid sector when sector invalid", () => {
    const result = validateBetaPackIntake({ ...VALID_BASE, sector: "unknown" }, ["local", "ecommerce"]);
    expect(result?.sector).toBe("local");
  });

  it("returns null for non-object body", () => {
    expect(validateBetaPackIntake("string", ["local"])).toBeNull();
    expect(validateBetaPackIntake(null, ["local"])).toBeNull();
    expect(validateBetaPackIntake(42, ["local"])).toBeNull();
  });

  it("defaults tier to professional", () => {
    const result = validateBetaPackIntake(VALID_BASE, ["local"]);
    expect(result?.tier).toBe("professional");
  });

  it("accepts premium tier", () => {
    const result = validateBetaPackIntake({ ...VALID_BASE, tier: "premium" }, ["local"]);
    expect(result?.tier).toBe("premium");
  });

  it("defaults country to ES", () => {
    const result = validateBetaPackIntake(VALID_BASE, ["local"]);
    expect(result?.country).toBe("ES");
  });
});

describe("per-pack validators", () => {
  it("validateSocialCalendarIntake — valid", () => {
    expect(validateSocialCalendarIntake(VALID_BASE)).not.toBeNull();
  });
  it("validateSocialCalendarIntake — invalid (missing city)", () => {
    expect(validateSocialCalendarIntake({ ...VALID_BASE, city: "" })).toBeNull();
  });

  it("validateContentStrategyIntake — valid", () => {
    expect(validateContentStrategyIntake(VALID_BASE)).not.toBeNull();
  });
  it("validateContentStrategyIntake — invalid", () => {
    expect(validateContentStrategyIntake(null)).toBeNull();
  });

  it("validateCroAuditIntake — valid", () => {
    expect(validateCroAuditIntake({ ...VALID_BASE, sector: "ecommerce" })).not.toBeNull();
  });
  it("validateCroAuditIntake — invalid", () => {
    expect(validateCroAuditIntake({ ...VALID_BASE, business_name: "" })).toBeNull();
  });

  it("validateAnalyticsSetupIntake — valid", () => {
    expect(validateAnalyticsSetupIntake({ ...VALID_BASE, sector: "saas_b2b" })).not.toBeNull();
  });
  it("validateAnalyticsSetupIntake — invalid", () => {
    expect(validateAnalyticsSetupIntake({})).toBeNull();
  });

  it("validateBrandVoiceIntake — valid", () => {
    expect(validateBrandVoiceIntake(VALID_BASE)).not.toBeNull();
  });
  it("validateBrandVoiceIntake — invalid", () => {
    expect(validateBrandVoiceIntake({ ...VALID_BASE, primary_cta: "" })).toBeNull();
  });
});
