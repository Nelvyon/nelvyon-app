/**
 * O21 — DataForSEO thin adapter (v1).
 * Optional fallback SEO data provider when no Semrush integration exists.
 * Requires DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD; without them it returns an
 * empty result with source 'none' and NEVER throws on the prod path.
 */

const API_BASE = "https://api.dataforseo.com/v3";
const TIMEOUT_MS = 15_000;

export type DataForSeoKeyword = {
  keyword: string;
  volume: number;
  cpc: number;
  difficulty: number;
};

export type DataForSeoResult = {
  keywords: DataForSeoKeyword[];
  source: "dataforseo" | "none";
};

export function isDataForSeoConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN?.trim() && process.env.DATAFORSEO_PASSWORD?.trim());
}

function authHeader(): string | null {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) return null;
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

function mapLocationCode(database: string): number {
  // Minimal DataForSEO location_code map (default Spain).
  const map: Record<string, number> = { es: 2724, us: 2840, uk: 2826, mx: 2484, fr: 2250, de: 2276 };
  return map[database.toLowerCase()] ?? 2724;
}

/**
 * Fetch ranked keywords for a domain. Best-effort: returns {keywords:[],source:'none'}
 * when unconfigured, on timeout, or on any API error — never throws.
 */
export async function fetchDomainKeywords(
  domain: string,
  database = "es",
): Promise<DataForSeoResult> {
  const auth = authHeader();
  if (!auth || !domain?.trim()) return { keywords: [], source: "none" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/dataforseo_labs/google/ranked_keywords/live`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          target: domain.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
          location_code: mapLocationCode(database),
          language_code: database.toLowerCase(),
          limit: 50,
        },
      ]),
      signal: controller.signal,
    });
    if (!res.ok) return { keywords: [], source: "none" };
    const json = (await res.json()) as {
      tasks?: Array<{ result?: Array<{ items?: Array<Record<string, unknown>> }> }>;
    };
    const items = json.tasks?.[0]?.result?.[0]?.items ?? [];
    const keywords: DataForSeoKeyword[] = items.map((it) => {
      const kd = (it.keyword_data ?? {}) as Record<string, unknown>;
      const info = (kd.keyword_info ?? {}) as Record<string, unknown>;
      const props = (kd.keyword_properties ?? {}) as Record<string, unknown>;
      return {
        keyword: String(kd.keyword ?? ""),
        volume: Number(info.search_volume ?? 0) || 0,
        cpc: Number(info.cpc ?? 0) || 0,
        difficulty: Number(props.keyword_difficulty ?? 0) || 0,
      };
    }).filter((k) => k.keyword);
    return { keywords, source: "dataforseo" };
  } catch {
    return { keywords: [], source: "none" };
  } finally {
    clearTimeout(timeout);
  }
}
