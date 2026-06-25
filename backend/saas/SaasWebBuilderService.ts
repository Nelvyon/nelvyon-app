/**
 * SaasWebBuilderService v2 — WYSIWYG builder CRUD, versions, DNS verify, CDN publish.
 * Tables: saas_web_pages (migrations 426/429/446), saas_web_page_versions (446).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import dns from "dns";

export class SaasWebBuilderError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SaasWebBuilderError";
  }
}

export type WebPageType = "landing" | "blog" | "product" | "about" | "contact" | "custom";
export type WebPageStatus = "draft" | "published" | "archived";
export type DomainStatus = "none" | "pending" | "verified" | "failed";
export type SslStatus = "pending" | "active" | "failed";

export type SectionType = "hero" | "text" | "features" | "cta" | "contact" | "image" | "video";

export type PageSection = {
  id: string;
  type: SectionType;
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
  seoTitle: string | null;
  seoDescription: string | null;
  publishedHtml: string | null;
  cdnUrl: string | null;
  views: number;
  publishedAt: string | null;
  customDomain: string | null;
  domainStatus: DomainStatus;
  domainVerifiedAt: string | null;
  sslStatus: SslStatus;
  sslVerifiedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type WebPageVersion = {
  id: string;
  pageId: string;
  version: number;
  sections: PageSection[];
  createdAt: string;
};

export type CreatePageInput = {
  title: string;
  slug?: string;
  type?: WebPageType;
  sections?: PageSection[];
  customDomain?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type UpdatePageInput = Partial<Pick<WebPage,
  "title" | "slug" | "type" | "sections" | "status" | "customDomain" | "seoTitle" | "seoDescription"
>>;

export type AddSectionInput = {
  type: SectionType;
  content?: Record<string, unknown>;
  atIndex?: number;
};

// ── Internal DB row types ─────────────────────────────────────────────────────

type PageRow = {
  id: string; tenant_id: string; title: string; slug: string; type: string; status: string;
  sections: unknown; seo_title: string | null; seo_description: string | null;
  published_html: string | null; cdn_url: string | null;
  views: number; published_at: Date | null; custom_domain: string | null;
  domain_status: string; domain_verified_at: Date | null;
  ssl_status: string; ssl_verified_at: Date | null;
  created_at: Date; updated_at: Date;
};

type VersionRow = { id: string; page_id: string; version: number; sections: unknown; created_at: Date };

const PAGE_TYPES: WebPageType[] = ["landing", "blog", "product", "about", "contact", "custom"];
const SECTION_TYPES: SectionType[] = ["hero", "text", "features", "cta", "contact", "image", "video"];
const PAGES_HOST = "pages.nelvyon.com";

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToPage(r: PageRow): WebPage {
  return {
    id: r.id, tenantId: r.tenant_id, title: r.title, slug: r.slug,
    type: r.type as WebPageType, status: r.status as WebPageStatus,
    sections: (r.sections as PageSection[]) ?? [],
    seoTitle: r.seo_title ?? null,
    seoDescription: r.seo_description ?? null,
    publishedHtml: r.published_html ?? null,
    cdnUrl: r.cdn_url ?? null,
    views: r.views,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    customDomain: r.custom_domain ?? null,
    domainStatus: (r.domain_status ?? "none") as DomainStatus,
    domainVerifiedAt: r.domain_verified_at ? new Date(r.domain_verified_at).toISOString() : null,
    sslStatus: (r.ssl_status ?? "pending") as SslStatus,
    sslVerifiedAt: r.ssl_verified_at ? new Date(r.ssl_verified_at).toISOString() : null,
    updatedAt: new Date(r.updated_at).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function rowToVersion(r: VersionRow): WebPageVersion {
  return {
    id: r.id, pageId: r.page_id, version: r.version,
    sections: (r.sections as PageSection[]) ?? [],
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const SELECT_PAGE = `
  id,tenant_id,title,slug,type,status,sections,
  seo_title,seo_description,published_html,cdn_url,
  views,published_at,custom_domain,
  domain_status,domain_verified_at,ssl_status,ssl_verified_at,
  created_at,updated_at
`;

function defaultSections(title: string): PageSection[] {
  return [
    { id: crypto.randomUUID(), type: "hero", content: { headline: title, subtitle: "", ctaLabel: "Empezar", ctaUrl: "#" } },
    { id: crypto.randomUUID(), type: "features", content: { heading: "Características", items: [
      { icon: "⚡", title: "Rápido", desc: "Respuesta inmediata" },
      { icon: "🔒", title: "Seguro", desc: "Protección total" },
      { icon: "🎯", title: "Efectivo", desc: "Resultados reales" },
    ] } },
    { id: crypto.randomUUID(), type: "cta", content: { heading: "¿Listo para empezar?", body: "Únete hoy.", ctaLabel: "Empezar ahora", ctaUrl: "#" } },
  ];
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasWebBuilderService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async list(tenantId: string): Promise<WebPage[]> {
    const rows = await this.db.query<PageRow>(
      `SELECT ${SELECT_PAGE} FROM saas_web_pages WHERE tenant_id=$1 ORDER BY updated_at DESC`,
      [tenantId],
    );
    return rows.map(rowToPage);
  }

  async get(tenantId: string, id: string): Promise<WebPage | null> {
    const rows = await this.db.query<PageRow>(
      `SELECT ${SELECT_PAGE} FROM saas_web_pages WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToPage(rows[0]) : null;
  }

  async getBySlug(tenantId: string, slug: string): Promise<WebPage | null> {
    const rows = await this.db.query<PageRow>(
      `SELECT ${SELECT_PAGE} FROM saas_web_pages WHERE tenant_id=$1 AND slug=$2 LIMIT 1`,
      [tenantId, slug],
    );
    return rows[0] ? rowToPage(rows[0]) : null;
  }

  async create(tenantId: string, input: CreatePageInput): Promise<WebPage> {
    if (!input.title.trim()) throw new SaasWebBuilderError("title is required", "VALIDATION");
    const type = input.type ?? "landing";
    if (!PAGE_TYPES.includes(type)) throw new SaasWebBuilderError(`Invalid type: ${type}`, "VALIDATION");
    const slug = input.slug?.trim() || slugify(input.title);
    const sections: PageSection[] = input.sections ?? defaultSections(input.title.trim());
    const rows = await this.db.query<PageRow>(
      `INSERT INTO saas_web_pages
         (tenant_id,title,slug,type,sections,custom_domain,seo_title,seo_description,updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,NOW())
       RETURNING ${SELECT_PAGE}`,
      [tenantId, input.title.trim(), slug, type, JSON.stringify(sections),
       input.customDomain ?? null, input.seoTitle ?? null, input.seoDescription ?? null],
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
    if (input.seoTitle !== undefined) { sets.push(`seo_title=$${idx++}`); params.push(input.seoTitle ?? null); }
    if (input.seoDescription !== undefined) { sets.push(`seo_description=$${idx++}`); params.push(input.seoDescription ?? null); }
    await this.db.query(
      `UPDATE saas_web_pages SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2`,
      params,
    );
    const updated = await this.get(tenantId, id);
    if (!updated) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_web_pages WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
  }

  // ── Section operations ────────────────────────────────────────────────────

  async addSection(tenantId: string, pageId: string, input: AddSectionInput): Promise<WebPage> {
    if (!SECTION_TYPES.includes(input.type)) {
      throw new SaasWebBuilderError(`Invalid section type: ${input.type}`, "VALIDATION");
    }
    const page = await this.get(tenantId, pageId);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    const newSection: PageSection = {
      id: crypto.randomUUID(),
      type: input.type,
      content: input.content ?? defaultSectionContent(input.type),
    };
    const sections = [...page.sections];
    const idx = typeof input.atIndex === "number" ? Math.min(input.atIndex, sections.length) : sections.length;
    sections.splice(idx, 0, newSection);
    return this.update(tenantId, pageId, { sections });
  }

  async deleteSection(tenantId: string, pageId: string, sectionId: string): Promise<WebPage> {
    const page = await this.get(tenantId, pageId);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    const sections = page.sections.filter(s => s.id !== sectionId);
    if (sections.length === page.sections.length) {
      throw new SaasWebBuilderError("Section not found", "NOT_FOUND");
    }
    return this.update(tenantId, pageId, { sections });
  }

  async duplicateSection(tenantId: string, pageId: string, sectionId: string): Promise<WebPage> {
    const page = await this.get(tenantId, pageId);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    const origIdx = page.sections.findIndex(s => s.id === sectionId);
    if (origIdx === -1) throw new SaasWebBuilderError("Section not found", "NOT_FOUND");
    const orig = page.sections[origIdx]!;
    const clone: PageSection = { id: crypto.randomUUID(), type: orig.type, content: { ...orig.content } };
    const sections = [...page.sections];
    sections.splice(origIdx + 1, 0, clone);
    return this.update(tenantId, pageId, { sections });
  }

  async reorderSections(tenantId: string, pageId: string, orderedIds: string[]): Promise<WebPage> {
    const page = await this.get(tenantId, pageId);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    const byId = new Map(page.sections.map(s => [s.id, s]));
    if (orderedIds.length !== page.sections.length || !orderedIds.every(id => byId.has(id))) {
      throw new SaasWebBuilderError("orderedIds must contain exactly all existing section IDs", "VALIDATION");
    }
    const sections = orderedIds.map(id => byId.get(id)!);
    return this.update(tenantId, pageId, { sections });
  }

  // ── Versions ──────────────────────────────────────────────────────────────

  async saveVersion(tenantId: string, pageId: string): Promise<WebPageVersion> {
    const page = await this.get(tenantId, pageId);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    const [last] = await this.db.query<{ max: number | null }>(
      `SELECT MAX(version) AS max FROM saas_web_page_versions WHERE page_id=$1`,
      [pageId],
    );
    const nextVersion = ((last?.max as number | null) ?? 0) + 1;
    const rows = await this.db.query<VersionRow>(
      `INSERT INTO saas_web_page_versions (page_id,version,sections)
       VALUES ($1,$2,$3::jsonb) RETURNING id,page_id,version,sections,created_at`,
      [pageId, nextVersion, JSON.stringify(page.sections)],
    );
    if (!rows[0]) throw new SaasWebBuilderError("Failed to save version", "DB_ERROR");
    return rowToVersion(rows[0]);
  }

  async listVersions(tenantId: string, pageId: string): Promise<WebPageVersion[]> {
    // Verify tenant ownership
    const page = await this.get(tenantId, pageId);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    const rows = await this.db.query<VersionRow>(
      `SELECT id,page_id,version,sections,created_at FROM saas_web_page_versions
       WHERE page_id=$1 ORDER BY version DESC`,
      [pageId],
    );
    return rows.map(rowToVersion);
  }

  async restoreVersion(tenantId: string, pageId: string, versionId: string): Promise<WebPage> {
    const page = await this.get(tenantId, pageId);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    const rows = await this.db.query<VersionRow>(
      `SELECT id,page_id,version,sections,created_at FROM saas_web_page_versions
       WHERE id=$1 AND page_id=$2 LIMIT 1`,
      [versionId, pageId],
    );
    if (!rows[0]) throw new SaasWebBuilderError("Version not found", "NOT_FOUND");
    const sections = (rows[0].sections as PageSection[]) ?? [];
    return this.update(tenantId, pageId, { sections });
  }

  // ── Domain & SSL ──────────────────────────────────────────────────────────

  async verifyCustomDomain(tenantId: string, pageId: string): Promise<{ ok: boolean; domainStatus: DomainStatus; error?: string }> {
    const page = await this.get(tenantId, pageId);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    if (!page.customDomain) throw new SaasWebBuilderError("No custom domain configured", "VALIDATION");

    // Mark as pending first
    await this.db.query(
      `UPDATE saas_web_pages SET domain_status='pending',updated_at=NOW() WHERE tenant_id=$1 AND id=$2`,
      [tenantId, pageId],
    );

    try {
      const addresses = await dns.promises.resolveCname(page.customDomain);
      const pointsToNelvyon = addresses.some(addr =>
        addr === PAGES_HOST || addr.endsWith("." + PAGES_HOST),
      );
      if (pointsToNelvyon) {
        await this.db.query(
          `UPDATE saas_web_pages SET domain_status='verified',domain_verified_at=NOW(),updated_at=NOW()
           WHERE tenant_id=$1 AND id=$2`,
          [tenantId, pageId],
        );
        // Auto-promote SSL when domain is verified
        await this.markSslActive(tenantId, pageId);
        return { ok: true, domainStatus: "verified" };
      } else {
        await this.db.query(
          `UPDATE saas_web_pages SET domain_status='failed',updated_at=NOW() WHERE tenant_id=$1 AND id=$2`,
          [tenantId, pageId],
        );
        return { ok: false, domainStatus: "failed", error: `CNAME must point to ${PAGES_HOST}` };
      }
    } catch {
      await this.db.query(
        `UPDATE saas_web_pages SET domain_status='failed',updated_at=NOW() WHERE tenant_id=$1 AND id=$2`,
        [tenantId, pageId],
      );
      return { ok: false, domainStatus: "failed", error: `DNS lookup failed for ${page.customDomain}` };
    }
  }

  async markSslActive(tenantId: string, pageId: string): Promise<void> {
    await this.db.query(
      `UPDATE saas_web_pages SET ssl_status='active',ssl_verified_at=NOW(),updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2`,
      [tenantId, pageId],
    );
  }

  // ── Publish v2 ────────────────────────────────────────────────────────────

  async publish(tenantId: string, id: string): Promise<WebPage> {
    const page = await this.get(tenantId, id);
    if (!page) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    if (!page.sections.length) throw new SaasWebBuilderError("Cannot publish page with no sections", "VALIDATION");

    const publishedHtml = this.renderHtml(page);

    // Resolve tenant subdomain for cdn_url
    const tenantRows = await this.db.query<{ subdomain: string | null; slug: string | null }>(
      `SELECT subdomain, slug FROM saas_tenants WHERE id=$1 LIMIT 1`,
      [tenantId],
    );
    const subdomain = tenantRows[0]?.subdomain ?? tenantRows[0]?.slug ?? tenantId.slice(0, 8);
    const cdnUrl = `https://${PAGES_HOST}/${subdomain}/${page.slug}`;

    const rows = await this.db.query<PageRow>(
      `UPDATE saas_web_pages
       SET status='published',published_at=NOW(),published_html=$3,cdn_url=$4,updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2
       RETURNING ${SELECT_PAGE}`,
      [tenantId, id, publishedHtml, cdnUrl],
    );
    if (!rows[0]) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    return rowToPage(rows[0]);
  }

  async unpublish(tenantId: string, id: string): Promise<WebPage> {
    const rows = await this.db.query<PageRow>(
      `UPDATE saas_web_pages SET status='draft',updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2
       RETURNING ${SELECT_PAGE}`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasWebBuilderError("Page not found", "NOT_FOUND");
    return rowToPage(rows[0]);
  }

  // ── Public accessors ──────────────────────────────────────────────────────

  async getPublicPage(tenantSubdomain: string, slug: string): Promise<WebPage | null> {
    const rows = await this.db.query<PageRow>(
      `SELECT p.${SELECT_PAGE.split(",").map(c => "p." + c.trim()).join(",")}
       FROM saas_web_pages p
       JOIN saas_tenants t ON t.id = p.tenant_id
       WHERE (t.subdomain=$1 OR t.slug=$1) AND p.slug=$2 AND p.status='published'
       LIMIT 1`,
      [tenantSubdomain, slug],
    );
    return rows[0] ? rowToPage(rows[0]) : null;
  }

  async getPublicPageByDomain(domain: string): Promise<WebPage | null> {
    const rows = await this.db.query<PageRow>(
      `SELECT ${SELECT_PAGE} FROM saas_web_pages
       WHERE custom_domain=$1 AND domain_status='verified' AND status='published'
       LIMIT 1`,
      [domain],
    );
    return rows[0] ? rowToPage(rows[0]) : null;
  }

  async recordView(tenantSubdomain: string, slug: string): Promise<void> {
    await this.db.query(
      `UPDATE saas_web_pages p
       SET views = p.views + 1
       FROM saas_tenants t
       WHERE t.id = p.tenant_id AND (t.subdomain=$1 OR t.slug=$1) AND p.slug=$2`,
      [tenantSubdomain, slug],
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  renderHtml(page: WebPage): string {
    const sectionHtml = page.sections.map((s) => {
      const c = s.content as Record<string, unknown>;
      switch (s.type) {
        case "hero":
          return `<section class="section-hero" style="padding:80px 20px;text-align:center;background:#0a0a0a;color:#fff">
            <h1 style="font-size:clamp(1.8rem,4vw,3rem);font-weight:700;margin:0 0 16px;line-height:1.15">${esc(String(c.headline ?? ""))}</h1>
            ${c.subtitle ? `<p style="font-size:1.15rem;color:#aaa;margin:0 0 28px;max-width:600px;margin-left:auto;margin-right:auto">${esc(String(c.subtitle))}</p>` : ""}
            ${c.ctaLabel ? `<a href="${esc(String(c.ctaUrl ?? "#"))}" style="display:inline-block;padding:14px 36px;background:#0084ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:1rem">${esc(String(c.ctaLabel))}</a>` : ""}
          </section>`;
        case "text":
          return `<section style="max-width:720px;margin:48px auto;padding:0 24px;color:#eee">
            ${c.heading ? `<h2 style="font-size:1.6rem;font-weight:600;margin:0 0 16px;color:#fff">${esc(String(c.heading))}</h2>` : ""}
            <p style="line-height:1.8;color:#ccc;font-size:1rem">${esc(String(c.body ?? ""))}</p>
          </section>`;
        case "features":
          return `<section style="max-width:960px;margin:48px auto;padding:0 24px">
            ${c.heading ? `<h2 style="text-align:center;font-size:1.6rem;font-weight:600;color:#fff;margin:0 0 32px">${esc(String(c.heading))}</h2>` : ""}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px">
              ${Array.isArray(c.items) ? (c.items as unknown[]).map((it: unknown) => {
                const item = it as Record<string, unknown>;
                return `<div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px">
                  <div style="font-size:2rem;margin-bottom:10px">${esc(String(item.icon ?? ""))}</div>
                  <h3 style="color:#fff;margin:0 0 8px;font-size:1.05rem;font-weight:600">${esc(String(item.title ?? ""))}</h3>
                  <p style="color:#aaa;font-size:0.875rem;margin:0;line-height:1.6">${esc(String(item.desc ?? ""))}</p>
                </div>`;
              }).join("") : ""}
            </div>
          </section>`;
        case "cta":
          return `<section style="text-align:center;padding:72px 24px;background:linear-gradient(135deg,#0a0a1a,#0d1a2e)">
            ${c.heading ? `<h2 style="color:#fff;font-size:1.85rem;margin:0 0 14px;font-weight:700">${esc(String(c.heading))}</h2>` : ""}
            ${c.body ? `<p style="color:#aaa;margin:0 0 28px;font-size:1rem;max-width:520px;margin-left:auto;margin-right:auto">${esc(String(c.body))}</p>` : ""}
            ${c.ctaLabel ? `<a href="${esc(String(c.ctaUrl ?? "#"))}" style="display:inline-block;padding:16px 40px;background:#0084ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:1.05rem">${esc(String(c.ctaLabel))}</a>` : ""}
          </section>`;
        case "contact":
          return `<section style="max-width:600px;margin:48px auto;padding:0 24px">
            ${c.heading ? `<h2 style="color:#fff;font-size:1.5rem;font-weight:600;margin:0 0 20px">${esc(String(c.heading))}</h2>` : ""}
            <form style="display:flex;flex-direction:column;gap:12px">
              <input type="text" placeholder="Tu nombre" style="padding:12px 16px;background:#111;border:1px solid #333;border-radius:6px;color:#fff;font-size:0.95rem"/>
              <input type="email" placeholder="Tu email" style="padding:12px 16px;background:#111;border:1px solid #333;border-radius:6px;color:#fff;font-size:0.95rem"/>
              <textarea placeholder="Tu mensaje" rows="4" style="padding:12px 16px;background:#111;border:1px solid #333;border-radius:6px;color:#fff;font-size:0.95rem;resize:vertical"></textarea>
              <button type="submit" style="padding:13px 28px;background:#0084ff;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:1rem">${esc(String(c.ctaLabel ?? "Enviar"))}</button>
            </form>
          </section>`;
        case "image":
          return c.src ? `<section style="max-width:960px;margin:32px auto;padding:0 24px">
            <img src="${esc(String(c.src))}" alt="${esc(String(c.alt ?? ""))}" style="width:100%;border-radius:12px;display:block"/>
            ${c.caption ? `<p style="text-align:center;color:#888;font-size:0.875rem;margin-top:10px">${esc(String(c.caption))}</p>` : ""}
          </section>` : "";
        case "video":
          return c.src ? `<section style="max-width:860px;margin:32px auto;padding:0 24px">
            <video src="${esc(String(c.src))}" controls style="width:100%;border-radius:12px;background:#000"></video>
          </section>` : "";
        default:
          return "";
      }
    }).join("\n");

    const seoTitle = page.seoTitle ?? page.title;
    const seoDesc = page.seoDescription ?? "";

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(seoTitle)}</title>
  ${seoDesc ? `<meta name="description" content="${esc(seoDesc)}"/>` : ""}
  <meta property="og:title" content="${esc(seoTitle)}"/>
  ${seoDesc ? `<meta property="og:description" content="${esc(seoDesc)}"/>` : ""}
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  </style>
</head>
<body>
${sectionHtml}
</body>
</html>`;
  }
}

// ── Default section content factory ──────────────────────────────────────────

function defaultSectionContent(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero": return { headline: "Nuevo título", subtitle: "Subtítulo", ctaLabel: "Empezar", ctaUrl: "#" };
    case "text": return { heading: "Sección de texto", body: "Escribe tu contenido aquí." };
    case "features": return { heading: "Características", items: [
      { icon: "⭐", title: "Feature 1", desc: "Descripción de la feature" },
    ] };
    case "cta": return { heading: "Llamada a la acción", body: "Descripción", ctaLabel: "Actuar", ctaUrl: "#" };
    case "contact": return { heading: "Contacta con nosotros", ctaLabel: "Enviar" };
    case "image": return { src: "", alt: "", caption: "" };
    case "video": return { src: "" };
    default: return {};
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: SaasWebBuilderService | null = null;
export function getSaasWebBuilderService(): SaasWebBuilderService {
  if (!_instance) _instance = new SaasWebBuilderService();
  return _instance;
}
export function resetSaasWebBuilderServiceForTests(): void { _instance = null; }
