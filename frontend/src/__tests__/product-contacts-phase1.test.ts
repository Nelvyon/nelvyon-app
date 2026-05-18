/**
 * PRODUCT-CONTACTS-1 FASE 1 — contratos de UI/archivo sin montar React (sin @testing-library).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("PRODUCT-CONTACTS-1 — contratos de código", () => {
  it("Inicio enlaza el KPI contactos al CRM", () => {
    const home = src("pages/saas/SaasWorkspaceHome.tsx");
    expect(home).toContain('linkTo="/saas/crm"');
    expect(home).toContain('data-testid="home-kpi-contacts-link"');
  });

  it("lista de contactos expone testids y fila clicable", () => {
    const tab = src("pages/saas/crm/CRMContactsTab.tsx");
    expect(tab).toContain('data-testid="crm-contacts-root"');
    expect(tab).toContain('data-testid="crm-contacts-table"');
    expect(tab).toContain("crm-contact-row-");
    expect(tab).toContain("onClick={() => onViewContact(c.id!)");
    expect(tab).toContain("Contacto");
    expect(tab).toContain("Estado");
  });

  it("ficha de contacto tiene testid y sección de datos", () => {
    const detail = src("pages/saas/crm/CRMContactDetail.tsx");
    expect(detail).toContain('data-testid="crm-contact-detail"');
    expect(detail).toContain('data-testid="crm-contact-detail-name"');
    expect(detail).toContain("Datos de contacto");
  });

  it("crmSearch mapea search → q para el backend", () => {
    const api = src("lib/api.ts");
    expect(api).toContain("q: q ?? search");
  });
});
