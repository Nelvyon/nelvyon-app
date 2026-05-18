/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { createArtifactZip, listZipEntryNames } from "../artifacts/artifactPublisher";
import { buildSectorReportFiles, runSectorReportCodegen } from "../artifacts/sectorReportBuilder";
import { isValidHtmlDocument } from "../artifacts/htmlUtils";

const adsJson = JSON.stringify({
  result: "Plan omnicanal con ROAS objetivo 4.2x en 90 días.",
  insights: ["Smart Bidding requiere conversiones limpias", "LAL desde compradores reduce CPA"],
  recommendedActions: ["Consolidar eventos CAPI", "Matriz creatividad × etapa"],
});

const seoJson = JSON.stringify({
  content: "Baseline de contenido thin en categorías principales.",
  score: 82,
  recommendations: ["Optimizar meta titles", "Mejorar LCP"],
  keywords: ["marketing digital", "agencia seo"],
});

describe("sectorReportBuilder", () => {
  it("genera report.html válido con secciones reconocibles (ads)", () => {
    const files = buildSectorReportFiles(adsJson, { clientName: "Acme", sector: "ads" });
    expect(isValidHtmlDocument(files["report.html"])).toBe(true);
    expect(files["report.html"]).toContain("Resumen ejecutivo");
    expect(files["report.html"]).toContain("Smart Bidding");
    expect(files["report.html"]).toContain("Plan de acción");
    expect(files["assets/styles.css"]).toContain(":root");
  });

  it("renderiza métricas y keywords (seo)", () => {
    const files = buildSectorReportFiles(seoJson, { clientName: "Beta Corp", sector: "seo" });
    expect(files["report.html"]).toContain("82");
    expect(files["report.html"]).toContain("marketing digital");
    expect(isValidHtmlDocument(files["report.html"])).toBe(true);
  });

  it("informe ejecutivo genérico para Markdown sin errores", () => {
    const md = "## Análisis\n\nHallazgo principal del sector.\n\n- Acción 1\n- Acción 2";
    const files = buildSectorReportFiles(md, { clientName: "Gamma" });
    expect(isValidHtmlDocument(files["report.html"])).toBe(true);
    expect(files["report.html"]).toContain("Hallazgo principal");
  });

  it("ZIP incluye report.html y assets/styles.css", () => {
    const files = buildSectorReportFiles(adsJson, { clientName: "Acme" });
    const names = listZipEntryNames(createArtifactZip(files));
    expect(names).toContain("report.html");
    expect(names).toContain("assets/styles.css");
  });

  it("runSectorReportCodegen valida HTML", () => {
    const summary = runSectorReportCodegen(adsJson, { clientName: "Acme" });
    expect(JSON.parse(summary).files).toContain("report.html");
  });
});
