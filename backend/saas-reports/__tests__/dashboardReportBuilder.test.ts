/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import {
  createArtifactZip,
  listZipEntryNames,
} from "../../os-agents/artifacts/artifactPublisher";
import { isValidHtmlDocument } from "../../os-agents/artifacts/htmlUtils";
import { buildDashboardReportFiles, runDashboardReportCodegen } from "../dashboardReportBuilder";

const sampleInput = {
  companyName: "Acme SaaS",
  industry: "ecommerce",
  plan: "pro",
  generatedAt: "17 de mayo de 2026",
  activeJobs: 2,
  completedJobs: 14,
  totalSpend: 420.5,
  metrics: {
    roi: [
      { date: "2026-05-01", revenue: 1200, spend: 400, roi: 200 },
      { date: "2026-05-02", revenue: 900, spend: 350, roi: 157 },
    ],
    traffic: [
      { date: "2026-05-01", sessions: 1200, users: 980, conversions: 48 },
      { date: "2026-05-02", sessions: 1100, users: 900, conversions: 52 },
    ],
    conversions: [
      { name: "purchase", value: 40, percentage: 62 },
      { name: "lead", value: 25, percentage: 38 },
    ],
    mrr: [
      { month: "2026-04", mrr: 5000, growth: 5 },
      { month: "2026-05", mrr: 5400, growth: 8 },
    ],
  },
};

describe("dashboardReportBuilder", () => {
  it("genera report.html válido con métricas renderizadas", () => {
    const files = buildDashboardReportFiles(sampleInput);
    expect(isValidHtmlDocument(files["report.html"])).toBe(true);
    expect(files["report.html"]).toContain("Resumen ejecutivo");
    expect(files["report.html"]).toContain("Métricas principales");
    expect(files["report.html"]).toContain("Rendimiento por canal");
    expect(files["report.html"]).toContain("Recomendaciones IA");
    expect(files["report.html"]).toContain("Próximos pasos");
    expect(files["report.html"]).toContain("Acme SaaS");
    expect(files["report.html"]).toContain("purchase");
    expect(files["assets/styles.css"]).toContain(":root");
  });

  it("tolera datos parciales sin lanzar", () => {
    const files = buildDashboardReportFiles({ companyName: "Mínimo" });
    expect(isValidHtmlDocument(files["report.html"])).toBe(true);
    expect(files["report.html"]).toContain("Mínimo");
  });

  it("ZIP incluye report.html y assets/styles.css", () => {
    const files = buildDashboardReportFiles(sampleInput);
    const names = listZipEntryNames(createArtifactZip(files));
    expect(names).toContain("report.html");
    expect(names).toContain("assets/styles.css");
  });

  it("runDashboardReportCodegen valida HTML", () => {
    const summary = runDashboardReportCodegen(sampleInput);
    expect(JSON.parse(summary).files).toContain("report.html");
  });
});
