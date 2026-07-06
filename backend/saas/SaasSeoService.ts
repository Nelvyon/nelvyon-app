import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export interface SeoKeyword {
  id: string;
  keyword: string;
  position: number;
  previousPosition: number | null;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  url: string | null;
  updatedAt: string;
  source: "tracked" | "semrush";
}

export interface SemrushFetchResult {
  keywords: SeoKeyword[];
  avgPosition: number | null;
  totalTraffic: number;
  error?: string;
}

function isMissingRelation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "42P01";
}

export class SaasSeoError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "CONSTRAINT" | "NOT_MIGRATED",
  ) {
    super(message);
    this.name = "SaasSeoError";
  }
}

type KeywordRow = {
  id: string;
  tenant_id: string;
  keyword: string;
  domain: string | null;
  position: number;
  previous_position: number | null;
  search_volume: number;
  difficulty: number;
  cpc: string | number;
  url: string | null;
  last_synced_at: Date | string | null;
  updated_at: Date | string;
};

function rowToKeyword(r: KeywordRow, source: "tracked" | "semrush" = "tracked"): SeoKeyword {
  return {
    id: r.id,
    keyword: r.keyword,
    position: r.position ?? 0,
    previousPosition: r.previous_position ?? null,
    searchVolume: r.search_volume ?? 0,
    difficulty: r.difficulty ?? 0,
    cpc: Number(r.cpc ?? 0),
    url: r.url,
    updatedAt: new Date(r.last_synced_at ?? r.updated_at).toISOString(),
    source,
  };
}

export function isSemrushConfigured(): boolean {
  return Boolean(process.env.SEMRUSH_API_KEY?.trim() && process.env.SEO_DOMAIN?.trim());
}

export class SaasSeoService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async listTracked(tenantId: string): Promise<SeoKeyword[]> {
    try {
      const rows = await this.db.query<KeywordRow>(
        `SELECT id, tenant_id, keyword, domain, position, previous_position, search_volume, difficulty,
                cpc, url, last_synced_at, updated_at
         FROM saas_seo_tracked_keywords
         WHERE tenant_id = $1
         ORDER BY keyword ASC`,
        [tenantId],
      );
      return rows.map((r) => rowToKeyword(r, "tracked"));
    } catch (e) {
      if (isMissingRelation(e)) return [];
      throw e;
    }
  }

  async addTracked(tenantId: string, keyword: string, domain?: string | null): Promise<SeoKeyword> {
    const kw = keyword.trim().toLowerCase();
    if (!kw) throw new SaasSeoError("keyword is required", "VALIDATION");
    try {
      const rows = await this.db.query<KeywordRow>(
        `INSERT INTO saas_seo_tracked_keywords (tenant_id, keyword, domain)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, keyword) DO UPDATE SET updated_at = NOW()
         RETURNING id, tenant_id, keyword, domain, position, previous_position, search_volume, difficulty,
                   cpc, url, last_synced_at, updated_at`,
        [tenantId, kw, domain?.trim() || process.env.SEO_DOMAIN?.trim() || null],
      );
      const row = rows[0];
      if (!row) throw new SaasSeoError("Failed to save keyword", "CONSTRAINT");
      return rowToKeyword(row, "tracked");
    } catch (e) {
      if (isMissingRelation(e)) {
        throw new SaasSeoError("SEO keywords table not migrated — run migration 509", "NOT_MIGRATED");
      }
      throw e;
    }
  }

  async addManyTracked(tenantId: string, keywords: string[], domain?: string | null): Promise<SeoKeyword[]> {
    const saved: SeoKeyword[] = [];
    for (const keyword of keywords) {
      saved.push(await this.addTracked(tenantId, keyword, domain));
    }
    return saved;
  }

  async removeTracked(tenantId: string, id: string): Promise<void> {
    try {
      const rows = await this.db.query<{ id: string }>(
        `DELETE FROM saas_seo_tracked_keywords WHERE tenant_id = $1 AND id = $2 RETURNING id`,
        [tenantId, id],
      );
      if (!rows[0]) throw new SaasSeoError("Keyword not found", "NOT_FOUND");
    } catch (e) {
      if (isMissingRelation(e)) {
        throw new SaasSeoError("SEO keywords table not migrated — run migration 509", "NOT_MIGRATED");
      }
      throw e;
    }
  }

  async enrichTrackedFromSemrush(tenantId: string): Promise<{ keywords: SeoKeyword[]; error?: string }> {
    const tracked = await this.listTracked(tenantId);
    const semrush = await this.fetchSemrushDomainKeywords();
    if (semrush.error) return { keywords: tracked, error: semrush.error };
    if (tracked.length === 0) return { keywords: tracked };

    try {
      const byKeyword = new Map(semrush.keywords.map((k) => [k.keyword.toLowerCase(), k]));
      for (const kw of tracked) {
        const live = byKeyword.get(kw.keyword.toLowerCase());
        if (!live) continue;
        await this.db.query(
          `UPDATE saas_seo_tracked_keywords
           SET previous_position = CASE WHEN position > 0 THEN position ELSE previous_position END,
               position = $3,
               search_volume = $4,
               cpc = $5,
               url = $6,
               last_synced_at = NOW(),
               updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2`,
          [tenantId, kw.id, live.position, live.searchVolume, live.cpc, live.url],
        );
      }
      return { keywords: await this.listTracked(tenantId) };
    } catch (e) {
      if (isMissingRelation(e)) return { keywords: tracked };
      throw e;
    }
  }

  async fetchSemrushDomainKeywords(): Promise<SemrushFetchResult> {
    const apiKey = process.env.SEMRUSH_API_KEY?.trim();
    const domain = process.env.SEO_DOMAIN?.trim();
    if (!apiKey || !domain) {
      return { keywords: [], avgPosition: null, totalTraffic: 0 };
    }

    const url = `https://api.semrush.com/?type=domain_organic&key=${apiKey}&domain=${encodeURIComponent(domain)}&database=es&display_limit=50&export_columns=Ph,Po,Pp,Nq,Cp,Ur`;
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok || text.startsWith("ERROR")) {
      return {
        keywords: [],
        avgPosition: null,
        totalTraffic: 0,
        error: text.slice(0, 200),
      };
    }

    const lines = text.trim().split("\n").slice(1);
    const keywords = lines.slice(0, 50).map((line, i) => {
      const [keyword, position, prev, volume, cpc, pageUrl] = line.split(";");
      return {
        id: `semrush-${i}`,
        keyword: keyword ?? "",
        position: Number(position ?? 0),
        previousPosition: prev ? Number(prev) : null,
        searchVolume: Number(volume ?? 0),
        difficulty: 0,
        cpc: Number(cpc ?? 0),
        url: pageUrl?.trim() ?? null,
        updatedAt: new Date().toISOString(),
        source: "semrush" as const,
      };
    });
    const avgPosition =
      keywords.length > 0
        ? Math.round(keywords.reduce((s, k) => s + k.position, 0) / keywords.length)
        : null;
    return {
      keywords,
      avgPosition,
      totalTraffic: keywords.reduce((s, k) => s + k.searchVolume, 0),
    };
  }

  mergeKeywords(tracked: SeoKeyword[], semrush: SeoKeyword[]): SeoKeyword[] {
    const seen = new Set(tracked.map((k) => k.keyword.toLowerCase()));
    const merged = [...tracked];
    for (const kw of semrush) {
      if (!seen.has(kw.keyword.toLowerCase())) merged.push(kw);
    }
    return merged;
  }
}

let _instance: SaasSeoService | null = null;
export function getSaasSeoService(): SaasSeoService {
  if (!_instance) _instance = new SaasSeoService();
  return _instance;
}
export function resetSaasSeoServiceForTests(): void {
  _instance = null;
}
