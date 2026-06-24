/**
 * SaasKnowledgeBaseService — artículos + categorías KB.
 * Tables: saas_kb_articles, saas_kb_categories (migration 439).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export interface KbCategory {
  id: string; tenantId: string; name: string; icon: string; slug: string;
  sortOrder: number; articleCount: number; createdAt: string;
}

export interface KbArticle {
  id: string; tenantId: string; categoryId: string | null; categoryName: string | null;
  title: string; slug: string; content: string; excerpt: string;
  published: boolean; views: number; helpful: number; notHelpful: number;
  createdAt: string; updatedAt: string;
}

export interface CreateArticleInput {
  title: string; content: string; excerpt?: string;
  categoryId?: string | null; published?: boolean;
}

export interface CreateCategoryInput { name: string; icon?: string; }

export class SaasKbError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION" | "CONFLICT") {
    super(message); this.name = "SaasKbError";
  }
}

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function rowToCategory(r: Record<string, unknown>): KbCategory {
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id ?? r.tenantId),
    name: String(r.name),
    icon: String(r.icon ?? "📁"),
    slug: String(r.slug),
    sortOrder: Number(r.sort_order ?? r.sortOrder ?? 0),
    articleCount: Number(r.article_count ?? r.articleCount ?? 0),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

function rowToArticle(r: Record<string, unknown>): KbArticle {
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id ?? r.tenantId),
    categoryId: r.category_id != null ? String(r.category_id) : null,
    categoryName: r.category_name != null ? String(r.category_name) : null,
    title: String(r.title),
    slug: String(r.slug),
    content: String(r.content ?? ""),
    excerpt: String(r.excerpt ?? ""),
    published: Boolean(r.published),
    views: Number(r.views ?? 0),
    helpful: Number(r.helpful ?? 0),
    notHelpful: Number(r.not_helpful ?? r.notHelpful ?? 0),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

const ARTICLE_SEL = `
  a.id, a.tenant_id, a.category_id, c.name AS category_name,
  a.title, a.slug, a.content, a.excerpt, a.published,
  a.views, a.helpful, a.not_helpful,
  a.created_at, a.updated_at`;

export class SaasKnowledgeBaseService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Categories ────────────────────────────────────────────────────────────

  async listCategories(tenantId: string): Promise<KbCategory[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT c.*, COUNT(a.id) AS article_count
       FROM saas_kb_categories c
       LEFT JOIN saas_kb_articles a ON a.category_id = c.id AND a.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1
       GROUP BY c.id ORDER BY c.sort_order, c.name`,
      [tenantId],
    );
    return rows.map(rowToCategory);
  }

  async createCategory(tenantId: string, input: CreateCategoryInput): Promise<KbCategory> {
    if (!input.name?.trim()) throw new SaasKbError("name es obligatorio", "VALIDATION");
    const slug = slugify(input.name);
    try {
      const rows = await this.db.query<Record<string, unknown>>(
        `INSERT INTO saas_kb_categories (tenant_id, name, icon, slug)
         VALUES ($1,$2,$3,$4)
         RETURNING *, 0 AS article_count`,
        [tenantId, input.name.trim(), input.icon ?? "📁", slug],
      );
      if (!rows[0]) throw new SaasKbError("Error al crear categoría", "VALIDATION");
      return rowToCategory(rows[0]);
    } catch (e: unknown) {
      if (e instanceof SaasKbError) throw e;
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("unique")) throw new SaasKbError("Ya existe una categoría con ese nombre", "CONFLICT");
      throw e;
    }
  }

  async deleteCategory(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_kb_categories WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasKbError("Categoría no encontrada", "NOT_FOUND");
  }

  // ── Articles ──────────────────────────────────────────────────────────────

  async listArticles(tenantId: string, opts?: { categoryId?: string; search?: string; published?: boolean }): Promise<KbArticle[]> {
    const conds = [`a.tenant_id = $1`];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (opts?.categoryId) { conds.push(`a.category_id = $${i++}::uuid`); params.push(opts.categoryId); }
    if (opts?.published !== undefined) { conds.push(`a.published = $${i++}`); params.push(opts.published); }
    if (opts?.search) { conds.push(`(a.title ILIKE $${i} OR a.excerpt ILIKE $${i})`); params.push(`%${opts.search}%`); i++; }
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${ARTICLE_SEL}
       FROM saas_kb_articles a
       LEFT JOIN saas_kb_categories c ON c.id = a.category_id
       WHERE ${conds.join(" AND ")}
       ORDER BY a.updated_at DESC`,
      params,
    );
    return rows.map(rowToArticle);
  }

  async getArticle(tenantId: string, id: string): Promise<KbArticle> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${ARTICLE_SEL}
       FROM saas_kb_articles a
       LEFT JOIN saas_kb_categories c ON c.id = a.category_id
       WHERE a.id=$1::uuid AND a.tenant_id=$2`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasKbError("Artículo no encontrado", "NOT_FOUND");
    return rowToArticle(rows[0]);
  }

  async createArticle(tenantId: string, input: CreateArticleInput): Promise<KbArticle> {
    if (!input.title?.trim()) throw new SaasKbError("title es obligatorio", "VALIDATION");
    if (!input.content?.trim()) throw new SaasKbError("content es obligatorio", "VALIDATION");
    const slug = slugify(input.title);
    const excerpt = input.excerpt?.trim() || input.content.slice(0, 160).replace(/#+\s*/g, "").trim();
    try {
      const rows = await this.db.query<Record<string, unknown>>(
        `INSERT INTO saas_kb_articles (tenant_id, category_id, title, slug, content, excerpt, published)
         VALUES ($1,$2::uuid,$3,$4,$5,$6,$7)
         RETURNING id, tenant_id, category_id, NULL AS category_name, title, slug, content, excerpt,
                   published, views, helpful, not_helpful, created_at, updated_at`,
        [tenantId, input.categoryId ?? null, input.title.trim(), slug, input.content.trim(), excerpt, input.published ?? false],
      );
      if (!rows[0]) throw new SaasKbError("Error al crear artículo", "VALIDATION");
      return rowToArticle(rows[0]);
    } catch (e: unknown) {
      if (e instanceof SaasKbError) throw e;
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("unique")) throw new SaasKbError("Ya existe un artículo con ese título", "CONFLICT");
      throw e;
    }
  }

  async updateArticle(tenantId: string, id: string, patch: Partial<CreateArticleInput>): Promise<KbArticle> {
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [id, tenantId];
    let idx = 3;
    if (patch.title !== undefined)      { sets.push(`title=$${idx++}`,    `slug=$${idx++}`); params.push(patch.title.trim(), slugify(patch.title)); }
    if (patch.content !== undefined)    { sets.push(`content=$${idx++}`);     params.push(patch.content); }
    if (patch.excerpt !== undefined)    { sets.push(`excerpt=$${idx++}`);     params.push(patch.excerpt); }
    if (patch.categoryId !== undefined) { sets.push(`category_id=$${idx++}::uuid`); params.push(patch.categoryId ?? null); }
    if (patch.published !== undefined)  { sets.push(`published=$${idx++}`);   params.push(patch.published); }
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_kb_articles SET ${sets.join(",")}
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING id, tenant_id, category_id, NULL AS category_name, title, slug, content, excerpt,
                 published, views, helpful, not_helpful, created_at, updated_at`,
      params,
    );
    if (!rows[0]) throw new SaasKbError("Artículo no encontrado", "NOT_FOUND");
    return rowToArticle(rows[0]);
  }

  async deleteArticle(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_kb_articles WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasKbError("Artículo no encontrado", "NOT_FOUND");
  }

  async voteArticle(tenantId: string, id: string, vote: "helpful" | "not_helpful"): Promise<void> {
    const col = vote === "helpful" ? "helpful" : "not_helpful";
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_kb_articles SET ${col}=${col}+1, updated_at=NOW()
       WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasKbError("Artículo no encontrado", "NOT_FOUND");
  }

  async incrementViews(tenantId: string, id: string): Promise<void> {
    await this.db.query(
      `UPDATE saas_kb_articles SET views=views+1 WHERE id=$1::uuid AND tenant_id=$2`,
      [id, tenantId],
    );
  }
}

let _instance: SaasKnowledgeBaseService | null = null;
export function getSaasKbService(): SaasKnowledgeBaseService {
  if (!_instance) _instance = new SaasKnowledgeBaseService();
  return _instance;
}
export function resetSaasKbServiceForTests(): void { _instance = null; }
