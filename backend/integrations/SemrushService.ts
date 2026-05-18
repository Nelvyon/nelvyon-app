import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const SEMRUSH_API = "https://api.semrush.com/";

export interface SemrushCredentials {
  userId: string;
  apiKey: string;
  isActive: boolean;
}

export interface DomainOverview {
  domain: string;
  rank: number;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  adKeywords: number;
  adTraffic: number;
  adCost: number;
}

export interface SemrushKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  cpc: number;
  competition: number;
  traffic: number;
}

export interface SemrushCompetitor {
  domain: string;
  commonKeywords: number;
  organicKeywords: number;
  traffic: number;
}

export interface SemrushBacklinks {
  totalBacklinks: number;
  referringDomains: number;
  authorityScore: number;
}

export interface SemrushKeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  results: number;
  trend: string;
}

export type SemrushServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

const DEFAULT_DATABASE = "us";

function toNum(v: string | undefined): number {
  if (v === undefined || v === "") return 0;
  const n = Number.parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Semrush returns CSV with semicolon separators; first row is column ids. */
export function parseSemrushCsv(text: string): { headers: string[]; rows: string[][] } {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [], rows: [] };
  const lines = trimmed.split(/\r?\n/).filter((l) => l.length > 0);
  const rows = lines.map((line) => line.split(";").map((c) => c.trim()));
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0] ?? [];
  return { headers, rows: rows.slice(1) };
}

function rowToMap(headers: string[], cells: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h) m[h] = cells[i] ?? "";
  }
  return m;
}

export class SemrushService {
  constructor(private readonly deps: SemrushServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async saveCredentials(userId: string, apiKey: string): Promise<void> {
    const key = apiKey.trim();
    if (!key) {
      throw new OsAgentError("apiKey es requerido.", "semrush_validation");
    }
    await this.db.query(
      `INSERT INTO integration_semrush (user_id, api_key, is_active, updated_at)
       VALUES ($1::uuid, $2, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         api_key = EXCLUDED.api_key,
         is_active = true,
         updated_at = NOW()`,
      [userId, key],
    );
  }

  async getCredentials(userId: string): Promise<SemrushCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      api_key: string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, api_key, is_active
       FROM integration_semrush
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.api_key) return null;
    return {
      userId: r.user_id,
      apiKey: r.api_key,
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<SemrushCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("Semrush is not connected for this user.", "semrush_auth");
    }
    return c;
  }

  private async getCsv(userId: string, params: Record<string, string>): Promise<string> {
    const c = await this.requireCredentials(userId);
    const search = new URLSearchParams({ ...params, key: c.apiKey });
    const url = `${SEMRUSH_API}?${search.toString()}`;
    const res = await this.fetchImpl(url, { method: "GET" });
    const text = await res.text();
    if (!res.ok) {
      throw new OsAgentError(`Semrush HTTP ${res.status}: ${text.slice(0, 400)}`, "semrush_http");
    }
    const t = text.trim();
    if (t.toUpperCase().startsWith("ERROR")) {
      throw new OsAgentError(`Semrush API: ${t.slice(0, 400)}`, "semrush_api");
    }
    return text;
  }

  async getDomainOverview(userId: string, domain: string, database: string = DEFAULT_DATABASE): Promise<DomainOverview> {
    const d = domain.trim().toLowerCase();
    if (!d) throw new OsAgentError("domain es requerido.", "semrush_validation");
    const csv = await this.getCsv(userId, {
      type: "domain_rank",
      domain: d,
      database: database.trim() || DEFAULT_DATABASE,
      export_columns: "Dn,Rk,Or,Ot,Oc,Ad,At,Ac",
    });
    const { headers, rows } = parseSemrushCsv(csv);
    const first = rows[0];
    if (!first || first.length === 0) {
      throw new OsAgentError("Semrush returned no domain_rank rows.", "semrush_api");
    }
    const m = rowToMap(headers, first);
    return {
      domain: m.Dn ?? d,
      rank: Math.round(toNum(m.Rk)),
      organicKeywords: Math.round(toNum(m.Or)),
      organicTraffic: Math.round(toNum(m.Ot)),
      organicCost: toNum(m.Oc),
      adKeywords: Math.round(toNum(m.Ad)),
      adTraffic: Math.round(toNum(m.At)),
      adCost: toNum(m.Ac),
    };
  }

  async getTopKeywords(userId: string, domain: string, limit = 10, database: string = DEFAULT_DATABASE): Promise<SemrushKeyword[]> {
    const d = domain.trim().toLowerCase();
    if (!d) throw new OsAgentError("domain es requerido.", "semrush_validation");
    const capped = Math.max(1, Math.min(limit, 100));
    const csv = await this.getCsv(userId, {
      type: "domain_organic",
      domain: d,
      database: database.trim() || DEFAULT_DATABASE,
      export_columns: "Ph,Po,Nq,Cp,Co,Tr,Tc,Nr,Td",
      display_limit: String(capped),
    });
    const { headers, rows } = parseSemrushCsv(csv);
    const out: SemrushKeyword[] = [];
    for (const cells of rows) {
      const m = rowToMap(headers, cells);
      out.push({
        keyword: m.Ph ?? "",
        position: Math.round(toNum(m.Po)),
        searchVolume: Math.round(toNum(m.Nq)),
        cpc: toNum(m.Cp),
        competition: toNum(m.Co),
        traffic: toNum(m.Tr),
      });
    }
    return out;
  }

  async getCompetitors(userId: string, domain: string, limit = 10, database: string = DEFAULT_DATABASE): Promise<SemrushCompetitor[]> {
    const d = domain.trim().toLowerCase();
    if (!d) throw new OsAgentError("domain es requerido.", "semrush_validation");
    const capped = Math.max(1, Math.min(limit, 100));
    const csv = await this.getCsv(userId, {
      type: "domain_organic_organic",
      domain: d,
      database: database.trim() || DEFAULT_DATABASE,
      export_columns: "Dn,Np,Or,Ot,Oc,Ad",
      display_limit: String(capped),
    });
    const { headers, rows } = parseSemrushCsv(csv);
    const out: SemrushCompetitor[] = [];
    for (const cells of rows) {
      const m = rowToMap(headers, cells);
      out.push({
        domain: (m.Dn ?? "").toLowerCase(),
        commonKeywords: Math.round(toNum(m.Np)),
        organicKeywords: Math.round(toNum(m.Or)),
        traffic: Math.round(toNum(m.Ot)),
      });
    }
    return out;
  }

  async getBacklinks(userId: string, domain: string): Promise<SemrushBacklinks> {
    const d = domain.trim().toLowerCase();
    if (!d) throw new OsAgentError("domain es requerido.", "semrush_validation");
    const csv = await this.getCsv(userId, {
      type: "backlinks_overview",
      target: d,
      target_type: "root_domain",
      export_columns: "total,domains_num,ascore",
    });
    const { headers, rows } = parseSemrushCsv(csv);
    const first = rows[0];
    if (!first || first.length === 0) {
      throw new OsAgentError("Semrush returned no backlinks_overview rows.", "semrush_api");
    }
    const m = rowToMap(headers, first);
    return {
      totalBacklinks: Math.round(toNum(m.total)),
      referringDomains: Math.round(toNum(m.domains_num)),
      authorityScore: Math.round(toNum(m.ascore)),
    };
  }

  async getKeywordResearch(userId: string, keyword: string, database: string = DEFAULT_DATABASE): Promise<SemrushKeywordData> {
    const phrase = keyword.trim();
    if (!phrase) throw new OsAgentError("keyword es requerido.", "semrush_validation");
    const csv = await this.getCsv(userId, {
      type: "phrase_this",
      phrase,
      database: database.trim() || DEFAULT_DATABASE,
      export_columns: "Ph,Nq,Cp,Co,Nr,Td",
    });
    const { headers, rows } = parseSemrushCsv(csv);
    const first = rows[0];
    if (!first || first.length === 0) {
      throw new OsAgentError("Semrush returned no phrase_this rows.", "semrush_api");
    }
    const m = rowToMap(headers, first);
    return {
      keyword: m.Ph ?? phrase,
      searchVolume: Math.round(toNum(m.Nq)),
      cpc: toNum(m.Cp),
      competition: toNum(m.Co),
      results: Math.round(toNum(m.Nr)),
      trend: String(m.Td ?? ""),
    };
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(`UPDATE integration_semrush SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`, [
      userId,
    ]);
  }
}

let cachedSemrush: SemrushService | undefined;

export function getSemrushService(): SemrushService {
  if (!cachedSemrush) cachedSemrush = new SemrushService();
  return cachedSemrush;
}

export function resetSemrushServiceForTests(): void {
  cachedSemrush = undefined;
}
