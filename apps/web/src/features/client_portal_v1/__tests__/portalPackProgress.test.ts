import { describe, expect, it } from "vitest";

import { buildPackPortalView } from "@/features/client_portal_v1/portalPackProgress";
import type { PortalDeliverable } from "@/features/client_portal_v1/types";

describe("buildPackPortalView", () => {
  const deliverables: PortalDeliverable[] = [
    {
      id: "d1",
      project_id: "p1",
      title: "Landing web local",
      status: "approved_by_client",
      version: 1,
    },
    {
      id: "d2",
      project_id: "p1",
      title: "Campaña email de bienvenida",
      status: "published",
      version: 1,
    },
    {
      id: "d3",
      project_id: "p1",
      title: "Informe ejecutivo",
      status: "published",
      version: 1,
      pack_summary: {
        pack_id: "local-business-growth",
        summary: "Pack local completado",
        kpis: { avg_qa_score: 88, skus_passed: 3, skus_total: 3 },
        next_steps: ["Activar Google Ads local"],
      },
    },
  ];

  it("builds tasks from catalog for local pack", () => {
    const view = buildPackPortalView("local-business-growth", deliverables);
    expect(view.packLabel).toBe("Local Growth Pack");
    expect(view.tasks.length).toBeGreaterThanOrEqual(4);
    expect(view.stats.approved).toBe(1);
    expect(view.stats.pending).toBe(2);
    expect(view.packSummary?.summary).toContain("Pack local");
  });

  it("maps ecommerce catalog", () => {
    const view = buildPackPortalView("ecommerce-growth", []);
    expect(view.packLabel).toBe("Ecommerce Growth Pack");
    expect(view.tasks.some((t) => t.catalogTitle.includes("Meta"))).toBe(true);
  });
});
