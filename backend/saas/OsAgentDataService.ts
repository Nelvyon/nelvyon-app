/**
 * O21 — OsAgentDataService
 * Brings real SEO data (Semrush / DataForSEO) into the OS pack pipeline with a
 * Postgres cache + audit. Ports are injectable so vitest never hits live APIs;
 * the production singleton lazy-loads SemrushService + DataForSeoAdapter.
 *
 * Never logs api_key. Never throws on the fetch path — agents degrade gracefully.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Ports ───────────────────────────────────────────────────────────────────────

export type AgentKeyword = { keyword: string; volume: number; cpc: number; difficulty: number };
export type AgentCompetitor = { domain: string; organicKeywords: number; traffic: number };

export type SemrushPort = {
  getTopKeywords(userId: string, domain: string, limit: number, db: string): Promise<Array<{ keyword: string; searchVolume: number; cpc: number; competition: number }>>;
  getCompetitors(userId: string, domain: string, limit: number, db: string): Promise<Array<{ domain: string; organicKeywords: number; traffic: number }>>;
};

export type DataForSeoPort = {
  isConfigured(): boolean;
  fetchDomainKeywords(domain: string, db: string): Promise<{ keywords: AgentKeyword[]; source: "dataforseo" | "none" }>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type AgentDataProvider = "semrush" | "dataforseo" | "mock";
export type AgentQueryType = "domain_overview" | "keywords" | "competitors" | "backlinks";

export type KeywordSnapshot = {
  configured: boolean;
  provider: AgentDataProvider | "none";
  cached: boolean;
  domain: string;
  keywords: AgentKeyword[];
  fetchedAt: string;
  reason?: string;
};

export type CompetitorSnapshot = {
  configured: boolean;
  provider: AgentDataProvider | "none";
  cached: boolean;
  domain: string;
  competitors: AgentCompetitor[];
  fetchedAt: string;
  reason?: string;
};

export type AgentDataSummary = {
  totalCached: number;
  semrushIntegrations: number;
  dataforseoConfigured: boolean;
  fetches24h: number;
  topDomains: Array<{ domain: string; count: number }>;
};

export type AgentDataRecent = {
  id: string;
  domain: string;
  provider: AgentDataProvider;
  queryType: AgentQueryType;
  keywordCount: number;
  fetchedAt: string;
  expiresAt: string;
  expired: boolean;
};

const TTL_HOURS = 24;

// ── Helpers ──────────────────────────────────────────────────────────────────────

function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

// ── Default ports ────────────────────────────────────────────────────────────────

const defaultSemrushPort: SemrushPort = {
  async getTopKeywords(userId, domain, limit, db) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSemrushService } = require("../integrations/SemrushService") as {
      getSemrushService: () => { getTopKeywords(u: string, d: string, l: number, db: string): Promise<Array<{ keyword: string; searchVolume: number; cpc: number; competition: number }>> };
    };
    return getSemrushService().getTopKeywords(userId, domain, limit, db);
  },
  async getCompetitors(userId, domain, limit, db) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSemrushService } = require("../integrations/SemrushService") as {
      getSemrushService: () => { getCompetitors(u: string, d: string, l: number, db: string): Promise<Array<{ domain: string; organicKeywords: number; traffic: number }>> };
    };
    return getSemrushService().getCompetitors(userId, domain, limit, db);
  },
};

const defaultDataForSeoPort: DataForSeoPort = {
  isConfigured() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isDataForSeoConfigured } = require("../integrations/DataForSeoAdapter") as { isDataForSeoConfigured: () => boolean };
    return isDataForSeoConfigured();
  },
  async fetchDomainKeywords(domain, db) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetchDomainKeywords } = require("../integrations/DataForSeoAdapter") as {
      fetchDomainKeywords: (d: string, db: string) => Promise<{ keywords: AgentKeyword[]; source: "dataforseo" | "none" }>;
    };
    return fetchDomainKeywords(domain, db);
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsAgentDataService | null = null;

export function getOsAgentDataService(): OsAgentDataService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsAgentDataService(DbClient.getInstance(), defaultSemrushPort, defaultDataForSeoPort);
  }
  return _instance;
}

export function resetOsAgentDataServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsAgentDataService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly semrush: SemrushPort = defaultSemrushPort,
    private readonly dataforseo: DataForSeoPort = defaultDataForSeoPort,
  ) {}

  cacheKey(domain: string, db = "es"): string {
    return `${normalizeDomain(domain)}:${db.toLowerCase()}`;
  }

  /** Pick the active provider for a user: semrush (integration or env) > dataforseo > none. */
  async resolveProvider(userId?: string): Promise<"semrush" | "dataforseo" | "none"> {
    if (userId) {
      try {
        const rows = await this.db.query<{ active: boolean }>(
          `SELECT true AS active FROM integration_semrush WHERE user_id = $1::uuid AND is_active = true LIMIT 1`,
          [userId],
        );
        if (rows[0]?.active) return "semrush";
      } catch { /* fall through */ }
    }
    if (process.env.SEMRUSH_API_KEY?.trim()) return "semrush";
    if (this.dataforseo.isConfigured()) return "dataforseo";
    return "none";
  }

  async getCached(queryKey: string, queryType: AgentQueryType, tenantId?: string | null): Promise<Record<string, unknown> | null> {
    try {
      const rows = await this.db.query<{ payload: Record<string, unknown>; expires_at: string; provider: AgentDataProvider }>(
        `SELECT payload, expires_at, provider FROM os_agent_data_cache
         WHERE COALESCE(tenant_id,'') = COALESCE($1,'') AND query_type = $2 AND query_key = $3
           AND expires_at > NOW()
         LIMIT 1`,
        [tenantId ?? null, queryType, queryKey],
      );
      return rows[0]?.payload ?? null;
    } catch {
      return null;
    }
  }

  async upsertCache(row: {
    tenantId?: string | null;
    userId?: string | null;
    provider: AgentDataProvider;
    queryType: AgentQueryType;
    queryKey: string;
    domain: string;
    database: string;
    payload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const expiresAt = new Date(Date.now() + TTL_HOURS * 3600_000).toISOString();
    await this.db.query(
      `INSERT INTO os_agent_data_cache
         (tenant_id, user_id, provider, query_type, query_key, domain, database_code, payload, fetched_at, expires_at, metadata)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb, NOW(), $9, $10::jsonb)
       ON CONFLICT (COALESCE(tenant_id,''), provider, query_type, query_key)
       DO UPDATE SET payload = EXCLUDED.payload, fetched_at = NOW(),
                     expires_at = EXCLUDED.expires_at, metadata = EXCLUDED.metadata,
                     domain = EXCLUDED.domain, database_code = EXCLUDED.database_code`,
      [
        row.tenantId ?? null, row.userId ?? null, row.provider, row.queryType, row.queryKey,
        row.domain, row.database, JSON.stringify(row.payload), expiresAt, JSON.stringify(row.metadata ?? {}),
      ],
    );
  }

  /** Keyword snapshot: cache → semrush → dataforseo → empty mock. Never throws. */
  async fetchKeywordSnapshot(opts: {
    userId?: string; tenantId?: string | null; domain: string; database?: string; limit?: number;
  }): Promise<KeywordSnapshot> {
    const database = opts.database ?? "es";
    const domain = normalizeDomain(opts.domain ?? "");
    const now = new Date().toISOString();
    if (!domain) {
      return { configured: false, provider: "none", cached: false, domain: "", keywords: [], fetchedAt: now, reason: "no_domain" };
    }
    const queryKey = this.cacheKey(domain, database);

    const cached = await this.getCached(queryKey, "keywords", opts.tenantId);
    if (cached) {
      return {
        configured: true,
        provider: (cached.provider as AgentDataProvider) ?? "mock",
        cached: true,
        domain,
        keywords: (cached.keywords as AgentKeyword[]) ?? [],
        fetchedAt: String(cached.fetchedAt ?? now),
      };
    }

    const provider = await this.resolveProvider(opts.userId);
    const partialErrors: string[] = [];

    // Semrush first
    if (provider === "semrush" && opts.userId) {
      try {
        const raw = await this.semrush.getTopKeywords(opts.userId, domain, opts.limit ?? 20, database);
        const keywords: AgentKeyword[] = raw.map((k) => ({
          keyword: k.keyword, volume: k.searchVolume, cpc: k.cpc, difficulty: Math.round((k.competition ?? 0) * 100),
        }));
        await this.persistSnapshot(opts, domain, database, queryKey, "semrush", "keywords", { provider: "semrush", keywords, fetchedAt: now });
        return { configured: true, provider: "semrush", cached: false, domain, keywords, fetchedAt: now };
      } catch (e) {
        partialErrors.push(`semrush: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // DataForSEO fallback
    if (this.dataforseo.isConfigured()) {
      try {
        const res = await this.dataforseo.fetchDomainKeywords(domain, database);
        if (res.source === "dataforseo") {
          await this.persistSnapshot(opts, domain, database, queryKey, "dataforseo", "keywords", { provider: "dataforseo", keywords: res.keywords, fetchedAt: now });
          return { configured: true, provider: "dataforseo", cached: false, domain, keywords: res.keywords, fetchedAt: now };
        }
      } catch (e) {
        partialErrors.push(`dataforseo: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // No provider — honest empty result (LLM-only path)
    return {
      configured: false,
      provider: "none",
      cached: false,
      domain,
      keywords: [],
      fetchedAt: now,
      reason: partialErrors.length > 0 ? partialErrors.join("; ") : "no_provider",
    };
  }

  /** Competitor snapshot: cache → semrush → empty. Never throws. */
  async fetchCompetitorSnapshot(opts: {
    userId?: string; tenantId?: string | null; domain: string; database?: string; limit?: number;
  }): Promise<CompetitorSnapshot> {
    const database = opts.database ?? "es";
    const domain = normalizeDomain(opts.domain ?? "");
    const now = new Date().toISOString();
    if (!domain) {
      return { configured: false, provider: "none", cached: false, domain: "", competitors: [], fetchedAt: now, reason: "no_domain" };
    }
    const queryKey = this.cacheKey(domain, database);

    const cached = await this.getCached(queryKey, "competitors", opts.tenantId);
    if (cached) {
      return {
        configured: true,
        provider: (cached.provider as AgentDataProvider) ?? "mock",
        cached: true,
        domain,
        competitors: (cached.competitors as AgentCompetitor[]) ?? [],
        fetchedAt: String(cached.fetchedAt ?? now),
      };
    }

    const provider = await this.resolveProvider(opts.userId);
    if (provider === "semrush" && opts.userId) {
      try {
        const raw = await this.semrush.getCompetitors(opts.userId, domain, opts.limit ?? 5, database);
        const competitors: AgentCompetitor[] = raw.map((c) => ({ domain: c.domain, organicKeywords: c.organicKeywords, traffic: c.traffic }));
        await this.persistSnapshot(opts, domain, database, queryKey, "semrush", "competitors", { provider: "semrush", competitors, fetchedAt: now });
        return { configured: true, provider: "semrush", cached: false, domain, competitors, fetchedAt: now };
      } catch {
        /* fall through to empty */
      }
    }
    return { configured: false, provider: "none", cached: false, domain, competitors: [], fetchedAt: now, reason: "no_provider" };
  }

  private async persistSnapshot(
    opts: { userId?: string; tenantId?: string | null },
    domain: string,
    database: string,
    queryKey: string,
    provider: AgentDataProvider,
    queryType: AgentQueryType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.upsertCache({
        tenantId: opts.tenantId ?? null,
        userId: opts.userId ?? null,
        provider, queryType, queryKey, domain, database, payload,
      });
    } catch { /* cache persistence is best-effort */ }
  }

  async getSummary(): Promise<AgentDataSummary> {
    let totalCached = 0;
    let fetches24h = 0;
    let topDomains: Array<{ domain: string; count: number }> = [];
    let semrushIntegrations = 0;
    try {
      const rows = await this.db.query<{ total: string; recent: string }>(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE fetched_at >= NOW() - INTERVAL '24 hours') AS recent
         FROM os_agent_data_cache`,
      );
      totalCached = parseInt(rows[0]?.total ?? "0", 10);
      fetches24h = parseInt(rows[0]?.recent ?? "0", 10);
    } catch { /* table missing */ }
    try {
      const rows = await this.db.query<{ domain: string; count: string }>(
        `SELECT domain, COUNT(*) AS count FROM os_agent_data_cache GROUP BY domain ORDER BY count DESC LIMIT 5`,
      );
      topDomains = rows.map((r) => ({ domain: r.domain, count: parseInt(r.count, 10) }));
    } catch { /* ignore */ }
    try {
      const rows = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM integration_semrush WHERE is_active = true`,
      );
      semrushIntegrations = parseInt(rows[0]?.count ?? "0", 10);
    } catch { /* ignore */ }

    return { totalCached, semrushIntegrations, dataforseoConfigured: this.dataforseo.isConfigured(), fetches24h, topDomains };
  }

  async listRecent(limit = 50): Promise<AgentDataRecent[]> {
    const rows = await this.db.query<{
      id: string; domain: string; provider: AgentDataProvider; query_type: AgentQueryType;
      payload: Record<string, unknown>; fetched_at: string; expires_at: string;
    }>(
      `SELECT id, domain, provider, query_type, payload, fetched_at, expires_at
       FROM os_agent_data_cache ORDER BY fetched_at DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    const now = Date.now();
    return rows.map((r) => {
      const kw = (r.payload?.keywords as unknown[]) ?? [];
      const comp = (r.payload?.competitors as unknown[]) ?? [];
      return {
        id: r.id,
        domain: r.domain,
        provider: r.provider,
        queryType: r.query_type,
        keywordCount: r.query_type === "competitors" ? comp.length : kw.length,
        fetchedAt: r.fetched_at,
        expiresAt: r.expires_at,
        expired: new Date(r.expires_at).getTime() <= now,
      };
    });
  }
}
