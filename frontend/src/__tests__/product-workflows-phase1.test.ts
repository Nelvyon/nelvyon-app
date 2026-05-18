/**
 * PRODUCT-WORKFLOWS-1 FASE 1 — contratos de UI/archivo sin montar React.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("PRODUCT-WORKFLOWS-1 — contratos de código", () => {
  it("home-summary incluye paso workflows hacia /saas/workflows", () => {
    const workspaceHomePath = join(__dirname, "..", "..", "..", "backend", "routers", "workspace_home.py");
    const homeApi = readFileSync(workspaceHomePath, "utf8");
    expect(homeApi).toContain('"/saas/workflows"');
    expect(homeApi).toContain('"id": "workflows"');
  });

  it("lista de workflows entidad: testids, cabecera, fila clicable y búsqueda", () => {
    const page = src("pages/saas/SaasWorkflows.tsx");
    expect(page).toContain('data-testid="workflows-root"');
    expect(page).toContain('data-testid="workflows-entity-list"');
    expect(page).toContain('data-testid="workflows-list-header"');
    expect(page).toContain('data-testid="workflows-entity-search"');
    expect(page).toContain("workflows-entity-row-");
    expect(page).toContain("Disparador");
    expect(page).toContain("setSelectedEntity(w)");
  });

  it("ficha: estado, trigger, CTA activar/desactivar y motor colapsable", () => {
    const page = src("pages/saas/SaasWorkflows.tsx");
    expect(page).toContain("workflows-entity-detail");
    expect(page).toContain('data-testid="workflows-detail-status"');
    expect(page).toContain('data-testid="workflows-detail-trigger"');
    expect(page).toContain('data-testid="workflows-detail-toggle-cta"');
    expect(page).toContain('data-testid="workflows-engine-toggle"');
  });
});
