/**
 * SaasUtmService — UTM link builder with short codes and click tracking.
 * Tenant-scoped. Pure DB, no external API.
 */
import { DbClient } from "../db/DbClient";
import { randomBytes } from "crypto";

export type UtmLink = {
  id: string;
  tenantId: string;
  name: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string | null;
  utmContent: string | null;
  shortCode: string;
  fullUrl: string;
  clicks: number;
  createdAt: string;
};

export type CreateUtmLinkInput = {
  name: string;
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm?: string;
  utmContent?: string;
};

export type UtmClickRecord = {
  id: string;
  utmLinkId: string;
  tenantId: string;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  clickedAt: string;
};

export type UtmStats = {
  totalClicks: number;
  clicksToday: number;
  clicksThisWeek: number;
  clicksThisMonth: number;
  topReferers: Array<{ referer: string; count: number }>;
  clicksByDay: Array<{ date: string; count: number }>;
};

export class SaasUtmError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION" | "CONFLICT") {
    super(message);
    this.name = "SaasUtmError";
  }
}

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };

type UtmRow = {
  id: string; tenant_id: string; name: string; destination_url: string;
  utm_source: string; utm_medium: string; utm_campaign: string;
  utm_term: string | null; utm_content: string | null;
  short_code: string; clicks: string; created_at: Date;
};

function buildFullUrl(row: UtmRow): string {
  try {
    const u = new URL(row.destination_url);
    u.searchParams.set("utm_source", row.utm_source);
    u.searchParams.set("utm_medium", row.utm_medium);
    u.searchParams.set("utm_campaign", row.utm_campaign);
    if (row.utm_term) u.searchParams.set("utm_term", row.utm_term);
    if (row.utm_content) u.searchParams.set("utm_content", row.utm_content);
    return u.toString();
  } catch {
    return row.destination_url;
  }
}

function rowToLink(r: UtmRow): UtmLink {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name,
    destinationUrl: r.destination_url, utmSource: r.utm_source,
    utmMedium: r.utm_medium, utmCampaign: r.utm_campaign,
    utmTerm: r.utm_term, utmContent: r.utm_content,
    shortCode: r.short_code, fullUrl: buildFullUrl(r),
    clicks: Number(r.clicks),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export class SaasUtmService {
  constructor(private readonly db: DbPort) {}

  async list(tenantId: string, search?: string): Promise<UtmLink[]> {
    let sql = `SELECT id,tenant_id,name,destination_url,utm_source,utm_medium,utm_campaign,utm_term,utm_content,short_code,clicks,created_at
               FROM saas_utm_links WHERE tenant_id=$1`;
    const params: unknown[] = [tenantId];
    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (name ILIKE $${params.length} OR utm_campaign ILIKE $${params.length})`;
    }
    sql += ` ORDER BY created_at DESC LIMIT 500`;
    const rows = await this.db.query<UtmRow>(sql, params);
    return rows.map(rowToLink);
  }

  async get(tenantId: string, id: string): Promise<UtmLink> {
    const rows = await this.db.query<UtmRow>(
      `SELECT id,tenant_id,name,destination_url,utm_source,utm_medium,utm_campaign,utm_term,utm_content,short_code,clicks,created_at
       FROM saas_utm_links WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [id, tenantId],
    );
    if (!rows.length) throw new SaasUtmError("UTM link not found", "NOT_FOUND");
    return rowToLink(rows[0]);
  }

  async getByShortCode(shortCode: string): Promise<UtmLink & { tenantId: string }> {
    const rows = await this.db.query<UtmRow>(
      `SELECT id,tenant_id,name,destination_url,utm_source,utm_medium,utm_campaign,utm_term,utm_content,short_code,clicks,created_at
       FROM saas_utm_links WHERE short_code=$1 LIMIT 1`,
      [shortCode],
    );
    if (!rows.length) throw new SaasUtmError("Short code not found", "NOT_FOUND");
    return rowToLink(rows[0]);
  }

  async create(tenantId: string, input: CreateUtmLinkInput): Promise<UtmLink> {
    if (!input.name?.trim()) throw new SaasUtmError("name required", "VALIDATION");
    if (!input.destinationUrl?.trim()) throw new SaasUtmError("destinationUrl required", "VALIDATION");
    if (!input.utmSource?.trim()) throw new SaasUtmError("utmSource required", "VALIDATION");
    if (!input.utmMedium?.trim()) throw new SaasUtmError("utmMedium required", "VALIDATION");
    if (!input.utmCampaign?.trim()) throw new SaasUtmError("utmCampaign required", "VALIDATION");
    try { new URL(input.destinationUrl); } catch { throw new SaasUtmError("destinationUrl must be a valid URL", "VALIDATION"); }

    const shortCode = randomBytes(4).toString("hex"); // 8-char hex
    const rows = await this.db.query<UtmRow>(
      `INSERT INTO saas_utm_links (tenant_id,name,destination_url,utm_source,utm_medium,utm_campaign,utm_term,utm_content,short_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id,tenant_id,name,destination_url,utm_source,utm_medium,utm_campaign,utm_term,utm_content,short_code,clicks,created_at`,
      [tenantId, input.name.trim(), input.destinationUrl.trim(), input.utmSource.trim(),
       input.utmMedium.trim(), input.utmCampaign.trim(),
       input.utmTerm?.trim() ?? null, input.utmContent?.trim() ?? null, shortCode],
    );
    return rowToLink(rows[0]);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_utm_links WHERE id=$1 AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    if (!rows.length) throw new SaasUtmError("UTM link not found", "NOT_FOUND");
  }

  /** Track a click — called from the public redirect endpoint */
  async trackClick(shortCode: string, opts: { ip?: string; userAgent?: string; referer?: string } = {}): Promise<string> {
    const link = await this.getByShortCode(shortCode);
    await Promise.all([
      this.db.query(
        `UPDATE saas_utm_links SET clicks = clicks + 1, updated_at = NOW() WHERE short_code=$1`,
        [shortCode],
      ),
      this.db.query(
        `INSERT INTO saas_utm_clicks (utm_link_id,tenant_id,ip,user_agent,referer) VALUES ($1,$2,$3,$4,$5)`,
        [link.id, link.tenantId, opts.ip ?? null, opts.userAgent ?? null, opts.referer ?? null],
      ),
    ]);
    return link.fullUrl;
  }

  async getStats(tenantId: string, id: string): Promise<UtmStats> {
    const link = await this.get(tenantId, id);
    const [totalRow, todayRow, weekRow, monthRow, refererRows, dayRows] = await Promise.all([
      this.db.query<{ count: string }>(`SELECT COUNT(*) count FROM saas_utm_clicks WHERE utm_link_id=$1`, [link.id]),
      this.db.query<{ count: string }>(`SELECT COUNT(*) count FROM saas_utm_clicks WHERE utm_link_id=$1 AND clicked_at >= CURRENT_DATE`, [link.id]),
      this.db.query<{ count: string }>(`SELECT COUNT(*) count FROM saas_utm_clicks WHERE utm_link_id=$1 AND clicked_at >= NOW() - INTERVAL '7 days'`, [link.id]),
      this.db.query<{ count: string }>(`SELECT COUNT(*) count FROM saas_utm_clicks WHERE utm_link_id=$1 AND clicked_at >= DATE_TRUNC('month', NOW())`, [link.id]),
      this.db.query<{ referer: string | null; count: string }>(
        `SELECT COALESCE(referer,'(direct)') referer, COUNT(*) count FROM saas_utm_clicks WHERE utm_link_id=$1 GROUP BY referer ORDER BY count DESC LIMIT 10`,
        [link.id],
      ),
      this.db.query<{ date: string; count: string }>(
        `SELECT DATE(clicked_at) date, COUNT(*) count FROM saas_utm_clicks WHERE utm_link_id=$1 AND clicked_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(clicked_at) ORDER BY date`,
        [link.id],
      ),
    ]);
    return {
      totalClicks: Number(totalRow[0]?.count ?? 0),
      clicksToday: Number(todayRow[0]?.count ?? 0),
      clicksThisWeek: Number(weekRow[0]?.count ?? 0),
      clicksThisMonth: Number(monthRow[0]?.count ?? 0),
      topReferers: refererRows.map((r) => ({ referer: r.referer ?? "(direct)", count: Number(r.count) })),
      clicksByDay: dayRows.map((r) => ({ date: r.date, count: Number(r.count) })),
    };
  }
}

let _instance: SaasUtmService | null = null;
export function getSaasUtmService(): SaasUtmService {
  if (!_instance) _instance = new SaasUtmService(DbClient.getInstance());
  return _instance;
}
export function resetSaasUtmServiceForTests(): void { _instance = null; }
