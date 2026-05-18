import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsOrchestrator } from "../os-agents/OsOrchestrator";

export type TemplateFilters = {
  sector?: string;
  type?: string;
  search?: string;
  page?: number;
};

export type TemplateConfig = {
  recommendedPayload: Record<string, unknown>;
  estimatedDurationMinutes: number;
  outputs: string[];
};

export type MarketplaceTemplate = {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  sector: string;
  type: string;
  installs: number;
  config: TemplateConfig;
};

const DEFAULT_CONFIG: TemplateConfig = {
  recommendedPayload: { objective: "growth" },
  estimatedDurationMinutes: 15,
  outputs: ["summary"],
};

function inferSector(serviceId: string): string {
  const s = serviceId.toLowerCase();
  if (s.includes("seo")) return "SEO";
  if (s.includes("ads")) return "Marketing";
  if (s.includes("social")) return "Social";
  if (s.includes("ecommerce") || s.includes("shopify")) return "E-commerce";
  if (s.includes("email")) return "Email";
  return "General";
}

function inferType(serviceId: string): string {
  const s = serviceId.toLowerCase();
  if (s.includes("premium")) return "agent";
  if (s.includes("integr")) return "integration";
  return "automation";
}

function makeConfig(serviceId: string): TemplateConfig {
  const s = serviceId.toLowerCase();
  if (s.includes("seo")) return { recommendedPayload: { keywordMode: "cluster" }, estimatedDurationMinutes: 25, outputs: ["brief", "tasks"] };
  if (s.includes("ads")) return { recommendedPayload: { budgetEur: 500 }, estimatedDurationMinutes: 20, outputs: ["ads_plan", "copy"] };
  if (s.includes("social")) return { recommendedPayload: { cadence: "weekly" }, estimatedDurationMinutes: 15, outputs: ["calendar"] };
  return DEFAULT_CONFIG;
}

export type TemplateMarketplaceServiceDeps = {
  db?: Pick<DbClient, "query">;
  orchestrator?: Pick<OsOrchestrator, "enqueueAndDispatch">;
};

export class TemplateMarketplaceService {
  constructor(private readonly deps: TemplateMarketplaceServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get orchestrator(): Pick<OsOrchestrator, "enqueueAndDispatch"> {
    return this.deps.orchestrator ?? OsOrchestrator;
  }

  async getTemplates(filters: TemplateFilters = {}): Promise<{ items: MarketplaceTemplate[]; total: number; page: number }> {
    const page = Math.max(1, Math.round(filters.page ?? 1));
    const limit = 24;
    const rows = await this.db.query<{ id: string; service_id: string; name: string; description: string | null }>(
      `SELECT id::text, service_id, name, description
       FROM os_service_catalog
       WHERE active = true
       ORDER BY created_at DESC`,
    );
    const installsRows = await this.db.query<{ service_id: string; installs: string }>(
      `SELECT service_id, COUNT(*)::text as installs
       FROM os_jobs
       GROUP BY service_id`,
    );
    const installsByService = new Map(installsRows.map((r) => [r.service_id, Number(r.installs)]));
    let items = rows.map((r) => ({
      id: r.id,
      serviceId: r.service_id,
      name: r.name,
      description: r.description ?? "",
      sector: inferSector(r.service_id),
      type: inferType(r.service_id),
      installs: installsByService.get(r.service_id) ?? 0,
      config: makeConfig(r.service_id),
    }));
    if (filters.sector) items = items.filter((t) => t.sector.toLowerCase() === filters.sector!.toLowerCase());
    if (filters.type) items = items.filter((t) => t.type.toLowerCase() === filters.type!.toLowerCase());
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter((t) => `${t.name} ${t.description} ${t.serviceId}`.toLowerCase().includes(q));
    }
    const total = items.length;
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), total, page };
  }

  async getTemplateById(templateId: string): Promise<MarketplaceTemplate | null> {
    const rows = await this.db.query<{ id: string; service_id: string; name: string; description: string | null }>(
      `SELECT id::text, service_id, name, description
       FROM os_service_catalog
       WHERE id = $1::uuid AND active = true
       LIMIT 1`,
      [templateId],
    );
    const r = rows[0];
    if (!r) return null;
    const installsRows = await this.db.query<{ installs: string }>(`SELECT COUNT(*)::text as installs FROM os_jobs WHERE service_id = $1`, [
      r.service_id,
    ]);
    return {
      id: r.id,
      serviceId: r.service_id,
      name: r.name,
      description: r.description ?? "",
      sector: inferSector(r.service_id),
      type: inferType(r.service_id),
      installs: Number(installsRows[0]?.installs ?? 0),
      config: makeConfig(r.service_id),
    };
  }

  async installTemplate(userId: string, templateId: string): Promise<{ jobId: string; template: MarketplaceTemplate }> {
    const tpl = await this.getTemplateById(templateId);
    if (!tpl) throw new Error("Template not found");
    const out = await this.orchestrator.enqueueAndDispatch({
      serviceId: tpl.serviceId,
      clientId: userId,
      payload: { templateId: tpl.id, templateName: tpl.name, ...tpl.config.recommendedPayload },
    });
    return { jobId: out.jobId, template: tpl };
  }

  async getFeaturedTemplates(): Promise<MarketplaceTemplate[]> {
    const { items } = await this.getTemplates({ page: 1 });
    return [...items].sort((a, b) => b.installs - a.installs).slice(0, 12);
  }
}

let cachedTemplateMarketplaceService: TemplateMarketplaceService | undefined;

export function getTemplateMarketplaceService(): TemplateMarketplaceService {
  if (!cachedTemplateMarketplaceService) cachedTemplateMarketplaceService = new TemplateMarketplaceService();
  return cachedTemplateMarketplaceService;
}

export function resetTemplateMarketplaceServiceForTests(): void {
  cachedTemplateMarketplaceService = undefined;
}
