/**
 * PRODUCT-CAMPAIGNS-1 FASE 1 — contratos de UI/archivo sin montar React.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("PRODUCT-CAMPAIGNS-1 — contratos de código", () => {
  it("Inicio enlaza el KPI de campañas a /saas/campaigns", () => {
    const home = src("pages/saas/SaasWorkspaceHome.tsx");
    expect(home).toContain('linkTo="/saas/campaigns"');
    expect(home).toContain('linkTestId="home-kpi-campaigns-link"');
  });

  it("lista email: testids, cabecera de columnas, fila clicable y acciones con stopPropagation", () => {
    const page = src("pages/saas/SaasCampaigns.tsx");
    expect(page).toContain('data-testid="campaigns-root"');
    expect(page).toContain('data-testid="campaigns-email-list"');
    expect(page).toContain('data-testid="campaigns-list-header"');
    expect(page).toContain('data-testid="campaigns-search"');
    expect(page).toContain("campaigns-email-row-");
    expect(page).toContain("Nombre");
    expect(page).toContain("Tipo");
    expect(page).toContain("Estado");
    expect(page).toContain("Destinatarios");
    expect(page).toContain("Actividad");
    expect(page).toContain("setSelectedEmail(camp)");
    expect(page).toContain("onClick={(e) => e.stopPropagation()}");
    expect(page).toContain("campaigns-row-send-");
  });

  it("ficha: contenedor, estado visible y CTA de envío", () => {
    const page = src("pages/saas/SaasCampaigns.tsx");
    expect(page).toContain('"campaigns-detail"');
    expect(page).toContain('data-testid="campaigns-detail-status"');
    expect(page).toContain('data-testid="campaigns-detail-send-cta"');
  });
});
