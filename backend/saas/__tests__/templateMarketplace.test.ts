// @ts-nocheck
import { describe, expect, it, vi } from "vitest";

import { TemplateMarketplaceService } from "../TemplateMarketplaceService";

describe("TemplateMarketplaceService", () => {
  it("getTemplates aplica filtros y pagina", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "00000000-0000-0000-0000-000000000001", service_id: "seo_premium", name: "SEO Pro", description: "Desc SEO" },
        { id: "00000000-0000-0000-0000-000000000002", service_id: "ads_premium", name: "Ads Pro", description: "Desc Ads" },
      ])
      .mockResolvedValueOnce([{ service_id: "seo_premium", installs: "5" }]);
    const svc = new TemplateMarketplaceService({ db: { query } as never, orchestrator: { enqueueAndDispatch: vi.fn() } as never });
    const out = await svc.getTemplates({ sector: "SEO", page: 1 });
    expect(out.total).toBe(1);
    expect(out.items[0].serviceId).toBe("seo_premium");
  });

  it("getTemplateById devuelve detalle con config", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "00000000-0000-0000-0000-000000000001", service_id: "social_media", name: "Social", description: null }])
      .mockResolvedValueOnce([{ installs: "12" }]);
    const svc = new TemplateMarketplaceService({ db: { query } as never, orchestrator: { enqueueAndDispatch: vi.fn() } as never });
    const out = await svc.getTemplateById("00000000-0000-0000-0000-000000000001");
    expect(out?.installs).toBe(12);
    expect(out?.config.outputs.length).toBeGreaterThan(0);
  });

  it("installTemplate crea job desde plantilla", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: "00000000-0000-0000-0000-000000000001", service_id: "ads_premium", name: "Ads", description: "A" }])
      .mockResolvedValueOnce([{ installs: "1" }]);
    const enqueueAndDispatch = vi.fn().mockResolvedValue({ jobId: "job-1", status: "queued" });
    const svc = new TemplateMarketplaceService({ db: { query } as never, orchestrator: { enqueueAndDispatch } as never });
    const out = await svc.installTemplate("00000000-0000-0000-0000-0000000000aa", "00000000-0000-0000-0000-000000000001");
    expect(out.jobId).toBe("job-1");
    expect(enqueueAndDispatch).toHaveBeenCalled();
  });

  it("getFeaturedTemplates retorna top 12", async () => {
    const baseRows = Array.from({ length: 15 }, (_, i) => ({
      id: `00000000-0000-0000-0000-0000000000${String(i).padStart(2, "0")}`,
      service_id: `svc_${i}`,
      name: `Plantilla ${i}`,
      description: "x",
    }));
    const usageRows = baseRows.map((r, i) => ({ service_id: r.service_id, installs: String(i) }));
    const query = vi.fn().mockResolvedValueOnce(baseRows).mockResolvedValueOnce(usageRows);
    const svc = new TemplateMarketplaceService({ db: { query } as never, orchestrator: { enqueueAndDispatch: vi.fn() } as never });
    const out = await svc.getFeaturedTemplates();
    expect(out).toHaveLength(12);
    expect(out[0].installs).toBeGreaterThanOrEqual(out[1].installs);
  });
});
