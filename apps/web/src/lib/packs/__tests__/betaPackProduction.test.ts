import { describe, expect, it } from "vitest";
import {
  buildSocialCalendar30d,
  buildContentEditorial90d,
  buildCroAuditArtifacts,
  buildAnalyticsSetupArtifacts,
  buildBrandVoiceArtifacts,
} from "../betaPackProduction";

const intake = {
  business_name: "Acme",
  sector: "local",
  city: "Madrid",
  value_proposition: "Citas online",
  primary_cta: "Reservar",
};

describe("betaPackProduction dedicated artifacts", () => {
  it("social calendar has 4 weeks and QA≥85", () => {
    const c = buildSocialCalendar30d(intake, 90);
    expect(c.weeks).toHaveLength(4);
    expect(c.qa_score).toBeGreaterThanOrEqual(85);
    expect(c.production).toBe(true);
  });

  it("content editorial has clusters + messaging", () => {
    const p = buildContentEditorial90d(intake, 88);
    expect(p.clusters.length).toBeGreaterThanOrEqual(3);
    expect(p.messaging.primary_cta).toBe("Reservar");
  });

  it("cro audit has friction + ab plan", () => {
    const a = buildCroAuditArtifacts(intake, 87);
    expect(a.audit.friction_points.length).toBeGreaterThan(0);
    expect(a.ab_plan.tests.length).toBeGreaterThanOrEqual(3);
  });

  it("analytics uses nelvyon stack note (ADR-048 no Matomo)", () => {
    const a = buildAnalyticsSetupArtifacts(intake, 90);
    expect(a.ga4_checklist.length).toBeGreaterThan(0);
    expect(String(a.dashboard.note)).toMatch(/ADR-048/);
  });

  it("brand voice has guide + 3 props + 3 personas", () => {
    const b = buildBrandVoiceArtifacts(intake, 91);
    expect(b.value_props).toHaveLength(3);
    expect(b.personas).toHaveLength(3);
    expect(b.voice_guide.do.length).toBeGreaterThan(0);
  });
});
