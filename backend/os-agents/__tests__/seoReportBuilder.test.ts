/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { createArtifactZip, listZipEntryNames } from "../artifacts/artifactPublisher";
import { buildSeoReportFiles } from "../artifacts/seoReportBuilder";
import { isValidHtmlDocument } from "../artifacts/htmlUtils";

const auditJson = JSON.stringify({
  auditScore: "82",
  quickWins: ["Optimizar meta titles", "Mejorar LCP"],
  criticalIssues: ["Enlaces rotos en footer"],
  contentBaseline: "Contenido thin en categorías principales",
  competitorSeoSnapshot: ["Comp A domina head terms"],
});

const keywordsJson = JSON.stringify({
  clusters: [{ headTerm: "marketing digital", intent: "comercial", priority: "alta" }],
});

const contentJson = JSON.stringify({
  pillarTopics: ["SEO técnico"],
  supportingArticles: ["Guía Core Web Vitals"],
});

const technicalJson = JSON.stringify({
  priorityTickets: ["Implementar schema Product", "Corregir canonicals"],
});

const linkJson = JSON.stringify({
  linkableAssets: ["Estudio sectorial 2026"],
});

describe("seoReportBuilder", () => {
  it("genera report.html y checklist.html con secciones SEO", () => {
    const files = buildSeoReportFiles(auditJson, keywordsJson, contentJson, technicalJson, linkJson, {
      clientName: "Acme",
    });
    expect(isValidHtmlDocument(files["report.html"])).toBe(true);
    expect(isValidHtmlDocument(files["checklist.html"])).toBe(true);
    expect(files["report.html"]).toContain("Resumen ejecutivo");
    expect(files["report.html"]).toContain("marketing digital");
    expect(files["checklist.html"]).toContain("Optimizar meta titles");
    expect(files["assets/styles.css"]).toContain(":root");
  });

  it("ZIP incluye informe y checklist", () => {
    const files = buildSeoReportFiles(auditJson, keywordsJson, contentJson, technicalJson, linkJson, {
      clientName: "Acme",
    });
    const names = listZipEntryNames(createArtifactZip(files));
    expect(names).toContain("report.html");
    expect(names).toContain("checklist.html");
    expect(names).toContain("assets/styles.css");
  });
});
