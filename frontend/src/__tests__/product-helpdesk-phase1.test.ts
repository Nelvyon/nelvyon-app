/**
 * PRODUCT-HELPDESK-1 FASE 1 — contratos de UI/archivo sin montar React (sin @testing-library).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("PRODUCT-HELPDESK-1 — contratos de código", () => {
  it("Inicio enlaza el KPI de tickets abiertos al helpdesk", () => {
    const home = src("pages/saas/SaasWorkspaceHome.tsx");
    expect(home).toContain('linkTo="/saas/helpdesk"');
    expect(home).toContain('linkTestId="home-kpi-helpdesk-link"');
  });

  it("lista de tickets expone testids, cabecera de columnas y fila clicable a ficha", () => {
    const page = src("pages/saas/SaasHelpdesk.tsx");
    expect(page).toContain('data-testid="helpdesk-root"');
    expect(page).toContain('data-testid="helpdesk-ticket-list"');
    expect(page).toContain('data-testid="helpdesk-list-header"');
    expect(page).toContain('data-testid="helpdesk-search"');
    expect(page).toContain("helpdesk-ticket-row-");
    expect(page).toContain("onClick={() => openDetail(t)}");
    expect(page).toContain("Asunto");
    expect(page).toContain("Prioridad");
    expect(page).toContain("Estado");
    expect(page).toContain("Asignado");
    expect(page).toContain("Actividad");
  });

  it("ficha de ticket expone estado, asignado y controles de transición/asignación", () => {
    const page = src("pages/saas/SaasHelpdesk.tsx");
    expect(page).toContain('data-testid="helpdesk-detail"');
    expect(page).toContain('data-testid="helpdesk-detail-status"');
    expect(page).toContain('data-testid="helpdesk-detail-assignee"');
    expect(page).toContain('data-testid="helpdesk-detail-assigned-input"');
    expect(page).toContain("key={selectedTicket.id}");
  });
});
