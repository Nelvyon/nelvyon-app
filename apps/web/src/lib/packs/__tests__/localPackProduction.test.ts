import { describe, expect, it } from "vitest";

import {
  buildWelcomeEmailSequence,
  containsMockUrl,
  enrichLocalIntake,
  LOCAL_PACK_CATALOG_TITLES,
  resolveLandingLiveUrl,
  slugFromBusinessName,
} from "@/lib/packs/localPackProduction";

describe("localPackProduction", () => {
  const intake = {
    business_name: "Clínica Norte QA",
    sector: "dental" as const,
    city: "Valencia",
    value_proposition: "Ortodoncia invisible",
    primary_cta: "Reservar cita",
    contact_email: "portal-local-qa@nelvyon.test",
    contact_name: "Ana QA",
  };

  it("builds landing slug and hosted URL", () => {
    const enriched = enrichLocalIntake(intake);
    expect(enriched.landing_slug).toBe("clinica-norte-qa");
    const url = resolveLandingLiveUrl(enriched, enriched.landing_slug, "https://staging.example.com");
    expect(url).toBe("https://staging.example.com/api/packs/local/live/clinica-norte-qa");
    expect(containsMockUrl(url)).toBe(false);
  });

  it("uses custom website when provided", () => {
    const url = resolveLandingLiveUrl(
      { ...intake, website_url: "https://clinicanorte.es" },
      slugFromBusinessName(intake.business_name),
      "https://staging.example.com",
    );
    expect(url).toBe("https://clinicanorte.es");
  });

  it("creates 3-touch welcome sequence", () => {
    const touches = buildWelcomeEmailSequence(intake);
    expect(touches).toHaveLength(3);
    expect(touches[0].touch).toBe(1);
    expect(touches[2].delay_hours).toBe(72);
  });

  it("exposes 5 catalog titles for portal", () => {
    expect(LOCAL_PACK_CATALOG_TITLES).toEqual([
      "Landing web local",
      "Auditoría SEO local",
      "Chatbot de citas",
      "Campaña email de bienvenida",
      "Informe ejecutivo",
    ]);
  });
});
