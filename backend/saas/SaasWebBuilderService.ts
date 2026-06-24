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
  customDomain: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CreatePageInput = {
  title: string;
  slug?: string;
  type?: WebPageType;
  sections?: PageSection[];
  customDomain?: string | null;
};

export type UpdatePageInput = Partial<Pick<WebPage, "title" | "slug" | "type" | "sections" | "status" | "customDomain">>;

type PageRow = {
  id: string; tenant_id: string; title: string; slug: string; type: string; status: string;
  sections: unknown; views: number; published_at: Date | null; custom_domain: string | null; created_at: Date; updated_at: Date;
};

const PAGE_TYPES: WebPageType[] = ["landing", "blog", "product", "about", "contact", "custom"];

function rowToPage(r: PageRow): WebPage {
  return {
    id: r.id, tenantId: r.tenant_id, title: r.title, slug: r.slug,
    type: r.type as WebPageType, status: r.status as WebPageStatus,
    sections: (r.sections as PageSection[]) ?? [],
    views: r.views,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    customDomain: r.custom_domain ?? null,
    updatedAt: new Date(r.updated_at).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export class SaasWebBuilderService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string): Promise<WebPage[]> {
    const rows = await this.db.query<PageRow>(
      `SELECT id,tenant_id,title,slug,type,status,sections,views,published_at,custom_domain,created_at,updated_at
       FROM saas_web_pages WHERE tenant_id=$1 ORDER BY updated_at DESC`,
      [tenantId],
    );
    return rows.map(rowToPage);
  }

  async get(tenantId: string, id: string): Promise<WebPage | null> {
    const rows = await this.db.query<PageRow>(
      `SELECT id,tenant_id,title,slug,type,status,sections,views,published_at,custom_domain,created_at,updated_at
       FROM saas_web_pages WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToPage(rows[0]) : null;
  }

  async getBySlug(tenantId: string, slug: string): Promise<WebPage | null> {
    const rows = await this.db.query<PageRow>(
      `SELECT id,tenant_id,title,slug,type,status,sections,views,published_at,custom_domain,created_at,updated_at
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
      `INSERT INTO saas_web_pages (tenant_id,title,slug,type,sections,custom_domain,updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,NOW())
       RETURNING id,tenant_id,title,slug,type,status,sections,views,published_at,custom_domain,created_at,updated_at`,
      [tenantId, input.title.trim(), slug, type, JSON.stringify(sections), input.customDomain ?? null],
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
    if (input.customDomain !== undefined) { sets.push(`custom_domain=$${idx++}`); params.push(input.customDomain ?? null); }
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
       RETURNING id,tenant_id,title,slug,type,status,sections,views,published_at,custom_domain,created_at,updated_at`,
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

  /** Render page sections as static HTML for hosting/export. */
  renderHtml(page: WebPage): string {
    const sectionHtml = page.sections.map((s) => {
      const c = s.content as Record<string, unknown>;
      switch (s.type) {
        case "hero":
          return `<section class="hero" style="padding:60px 20px;text-align:center;background:#0a0a0a;color:#fff">
            <h1 style="font-size:2.5rem;font-weight:700;margin:0 0 16px">${esc(String(c.headline ?? ""))}</h1>
            ${c.subtitle ? `<p style="font-size:1.2rem;color:#aaa;margin:0 0 24px">${esc(String(c.subtitle))}</p>` : ""}
            ${c.ctaLabel ? `<a href="${esc(String(c.ctaUrl ?? "#"))}" style="display:inline-block;padding:14px 32px;background:#0084ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${esc(String(c.ctaLabel))}</a>` : ""}
          </section>`;
        case "text":
          return `<section style="max-width:720px;margin:40px auto;padding:0 20px;color:#eee">
            ${c.heading ? `<h2 style="font-size:1.5rem;font-weight:600;margin:0 0 12px">${esc(String(c.heading))}</h2>` : ""}
            <p style="line-height:1.7;color:#ccc">${esc(String(c.body ?? ""))}</p>
          </section>`;
        case "features":
          return `<section style="max-width:900px;margin:40px auto;padding:0 20px">
            ${c.heading ? `<h2 style="text-align:center;font-size:1.5rem;font-weight:600;color:#fff;margin:0 0 24px">${esc(String(c.heading))}</h2>` : ""}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px">
              ${Array.isArray(c.items) ? (c.items as unknown[]).map((it: unknown) => { const item = it as Record<string, unknown>; return `<div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px">
                <div style="font-size:1.5rem;margin-bottom:8px">${esc(String(item.icon ?? ""))}</div>
                <h3 style="color:#fff;margin:0 0 6px;font-size:1rem">${esc(String(item.title ?? ""))}</h3>
                <p style="color:#aaa;font-size:0.875rem;margin:0">${esc(String(item.desc ?? ""))}</p>
              </div>`; }).join("") : ""}
            </div>
          </section>`;
        case "cta":
          return `<section style="text-align:center;padding:60px 20px;background:#0a0a1a">
            ${c.heading ? `<h2 style="color:#fff;font-size:1.75rem;margin:0 0 12px">${esc(String(c.heading))}</h2>` : ""}
            ${c.body ? `<p style="color:#aaa;margin:0 0 24px">${esc(String(c.body))}</p>` : ""}
            ${c.ctaLabel ? `<a href="${esc(String(c.ctaUrl ?? "#"))}" style="display:inline-block;padding:14px 32px;background:#0084ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${esc(String(c.ctaLabel))}</a>` : ""}
          </section>`;
        default:
          return "";
      }
    }).join("\n");

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(page.title)}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}</style>
</head>
<body>
${sectionHtml}
</body>
</html>`;
  }
}

let _instance: SaasWebBuilderService | null = null;
export function getSaasWebBuilderService(): SaasWebBuilderService {
  if (!_instance) _instance = new SaasWebBuilderService();
  return _instance;
}
export function resetSaasWebBuilderServiceForTests(): void { _instance = null; }
