/**
 * SaasWebBuilderService — tenant page builder CRUD + publish.
 * Table: saas_web_pages (migration 426).
 * "Publish" sets status='published' and published_at=NOW().
 * For actual hosting, the published_at timestamp signals that CDN/export can pick up the page.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export class SaasWebBuilderError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SaasWebBuilderError";
  }
}

export type WebPageType = "landing" | "blog" | "product" | "about" | "contact" | "custom";
export type WebPageStatus = "draft" | "published" | "archived";

export type PageSection = {
  id: string;
  type: "hero" | "text" | "features" | "cta" | "contact" | "image" | "video";
  content: Record<string, unknown>;
};

export type WebPage = {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  type: WebPageType;
  status: WebPageStatus;
  sections: PageSection[];
  views: number;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CreatePageInput = {
  title: string;
  slug?: string;
  type?: WebPageType;
  sections?: PageSection[];
};

export type UpdatePageInput = Partial<Pick<WebPage, "title" | "slug" | "type" | "sections" | "status">>;

type PageRow = {
  id: string; tenant_id: string; title: string; slug: string; type: string; status: string;
  sections: unknown; views: number; published_at: Date | null; created_at: Date; updated_at: Date;
};

const PAGE_TYPES: WebPageType[] = ["landing", "blog", "product", "about", "contact", "custom"];

function rowToPage(r: PageRow): WebPage {
  return {
    id: r.id, tenantId: r.tenant_id, title: r.title, slug: r.slug,
    type: r.type as WebPageType, status: r.status as WebPageStatus,
    sections: (r.sections as PageSection[]) ?? [],
    views: r.views,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    updatedAt: new Date(r.updated_at).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export class SaasWebBuilderService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string): Promise<WebPage[]> {
    const rows = await this.db.query<PageRow>(
      `SELECT id,tenant_id,title,slug,type,status,sections,views,published_at,created_at,updated_at
       FROM saas_web_pages WHERE tenant_id=$1 ORDER BY updated_at DESC`,
      [tenantId],
    );
    return rows.map(rowToPage);
  }

  async get(tenantId: string, id: string): Promise<WebPage | null> {
    const rows = await this.db.query<PageRow>(
      `SELECT id,tenant_id,title,slug,type,status,sections,views,published_at,created_at,updated_at
       FROM saas_web_pages WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToPage(rows[0]) : null;
  }

  async getBySlug(tenantId: string, slug: string): Promise<WebPage | null> {
    const rows = await this.db.query<PageRow>(
      `SELECT id,tenant_id,title,slug,type,status,sections,views,published_at,created_at,updated_at
       FROM saas_web_pages WHERE tenant_id=$1 AND slug=$2 LIMIT 1`,
      [tenantId, slug],
    );
    return rows[0] ? rowToPage(rows[0]) : null;
  }

  async create(tenantId: string, input: CreatePageInput): Promise<WebPage> {
    if (!input.title.trim()) throw new SaasWebBuilderError("title is required", "VALIDATION");
    const type = input.type ?? "landing";
    if (!PAGE_TYPES.includes(type)) throw new SaasWebBuilderError(`Invalid type: ${type}`, "VALIDATION");
    const slug = input.slug?.trim() || slugify(input.title);
    const sections: PageSection[] = input.sections ?? [
      { id: crypto.randomUUID(), type: "hero", content: { headline: input.title, subtitle: "", ctaLabel: "Empezar" } },
    ];
    const rows = await this.db.query<PageRow>(
      `INSERT INTO saas_web_pages (tenant_id,title,slug,type,sections,updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,NOW())
       RETURNING id,tenant_id,title,slug,type,status,sections,views,published_at,created_at,updated_at`,
      [tenantId, input.title.trim(), slug, type, JSON.stringify(sections)],
    );
    if (!rows[0]) throw new SaasWebBuilderError("Failed to create page", "DB_ERROR");
    return rowToPage(rows[0]);
  }

  async update(tenantId: string, id: string, input: UpdatePageInput): Promise<WebPage> {
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [tenantId, id];
    let idx = 3;
    if (input.title !== undefined) { sets.push(`title=$${idx++}`); params.push(input.title.trim()); }
    if (input.slug !== undefined) { sets.push(`slug=$${idx++}`); params.push(input.slug.trim()); }
    if (input.type !== undefined) {
      if (!PAGE_TYPES.includes(input.type)) throw new SaasWebBuilderError(`Invalid type: ${input.type}`, "VALIDATION");
      sets.push(`type=$${idx++}`); params.push(input.type);
    }
    if (input.sections !== undefined) { sets.push(`sections=$${idx++}::jsonb`); params.push(JSON.stringify(input.sections)); }
    if (input.status !== undefined) { sets.push(`status=$${idx++}`); params.push(input.status); }
    await this.db.query(
      `UPDATE saas_web_pages SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2`,
      params,
    );
    const updated = await this.get(tenantId, id);
    if (!updated) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    return updated;
  }

  async publish(tenantId: string, id: string): Promise<WebPage> {
    const rows = await this.db.query<PageRow>(
      `UPDATE saas_web_pages SET status='published',published_at=NOW(),updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2
       RETURNING id,tenant_id,title,slug,type,status,sections,views,published_at,created_at,updated_at`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    return rowToPage(rows[0]);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_web_pages WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
  }
}

let _instance: SaasWebBuilderService | null = null;
export function getSaasWebBuilderService(): SaasWebBuilderService {
  if (!_instance) _instance = new SaasWebBuilderService();
  return _instance;
}
export function resetSaasWebBuilderServiceForTests(): void { _instance = null; }
