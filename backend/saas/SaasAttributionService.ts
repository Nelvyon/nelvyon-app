/**
 * SaasAttributionService — multi-touch attribution UTM.
 * Tables: saas_lead_attribution (migration 440).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type AttributionEventType = "visit" | "form_submit" | "email_click" | "conversion";

export interface AttributionEvent {
  id: string; tenantId: string; contactId: string | null;
  utmSource: string | null; utmMedium: string | null; utmCampaign: string | null;
  utmContent: string | null; utmTerm: string | null;
  pageUrl: string | null; referrer: string | null;
  eventType: AttributionEventType; createdAt: string;
}

export interface TrackEventInput {
  contactId?: string | null;
  utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null;
  utmContent?: string | null; utmTerm?: string | null;
  pageUrl?: string | null; referrer?: string | null;
  eventType?: AttributionEventType;
}

export interface ChannelBreakdown {
  utmSource: string; utmMedium: string | null;
  visits: number; formSubmits: number; conversions: number;
  contacts: number;
}

export interface CampaignBreakdown {
  utmCampaign: string; utmSource: string | null;
  visits: number; formSubmits: number; conversions: number;
  contacts: number;
}

export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

export interface ModelCredit {
  utmSource: string; utmMedium: string | null; utmCampaign: string | null;
  credit: number;
  conversions: number;
}

export interface ModelBreakdown {
  model: AttributionModel;
  days: number;
  channels: ModelCredit[];
}

export class SaasAttributionError extends Error {
  constructor(message: string, public code: "VALIDATION") {
    super(message); this.name = "SaasAttributionError";
  }
}

function rowToEvent(r: Record<string, unknown>): AttributionEvent {
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id ?? r.tenantId),
    contactId: r.contact_id != null ? String(r.contact_id) : null,
    utmSource:   r.utm_source   != null ? String(r.utm_source)   : null,
    utmMedium:   r.utm_medium   != null ? String(r.utm_medium)   : null,
    utmCampaign: r.utm_campaign != null ? String(r.utm_campaign) : null,
    utmContent:  r.utm_content  != null ? String(r.utm_content)  : null,
    utmTerm:     r.utm_term     != null ? String(r.utm_term)     : null,
    pageUrl:  r.page_url  != null ? String(r.page_url)  : null,
    referrer: r.referrer  != null ? String(r.referrer)  : null,
    eventType: String(r.event_type ?? "visit") as AttributionEventType,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export class SaasAttributionService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async trackEvent(tenantId: string, input: TrackEventInput): Promise<AttributionEvent> {
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_lead_attribution
         (tenant_id,contact_id,utm_source,utm_medium,utm_campaign,utm_content,utm_term,page_url,referrer,event_type)
       VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        tenantId, input.contactId ?? null,
        input.utmSource ?? null, input.utmMedium ?? null, input.utmCampaign ?? null,
        input.utmContent ?? null, input.utmTerm ?? null,
        input.pageUrl ?? null, input.referrer ?? null,
        input.eventType ?? "visit",
      ],
    );
    if (!rows[0]) throw new SaasAttributionError("Error al registrar evento", "VALIDATION");
    return rowToEvent(rows[0]);
  }

  async getChannelBreakdown(tenantId: string, days = 30): Promise<ChannelBreakdown[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT
         COALESCE(utm_source, '(direct)') AS utm_source,
         utm_medium,
         COUNT(*) FILTER (WHERE event_type='visit')        AS visits,
         COUNT(*) FILTER (WHERE event_type='form_submit')  AS form_submits,
         COUNT(*) FILTER (WHERE event_type='conversion')   AS conversions,
         COUNT(DISTINCT contact_id) FILTER (WHERE contact_id IS NOT NULL) AS contacts
       FROM saas_lead_attribution
       WHERE tenant_id=$1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY utm_source, utm_medium
       ORDER BY visits DESC`,
      [tenantId, String(days)],
    );
    return rows.map(r => ({
      utmSource:   String(r.utm_source ?? "(direct)"),
      utmMedium:   r.utm_medium != null ? String(r.utm_medium) : null,
      visits:      Number(r.visits ?? 0),
      formSubmits: Number(r.form_submits ?? 0),
      conversions: Number(r.conversions ?? 0),
      contacts:    Number(r.contacts ?? 0),
    }));
  }

  async getCampaignBreakdown(tenantId: string, days = 30): Promise<CampaignBreakdown[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT
         COALESCE(utm_campaign, '(sin campaña)') AS utm_campaign,
         utm_source,
         COUNT(*) FILTER (WHERE event_type='visit')        AS visits,
         COUNT(*) FILTER (WHERE event_type='form_submit')  AS form_submits,
         COUNT(*) FILTER (WHERE event_type='conversion')   AS conversions,
         COUNT(DISTINCT contact_id) FILTER (WHERE contact_id IS NOT NULL) AS contacts
       FROM saas_lead_attribution
       WHERE tenant_id=$1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL
         AND utm_campaign IS NOT NULL
       GROUP BY utm_campaign, utm_source
       ORDER BY visits DESC`,
      [tenantId, String(days)],
    );
    return rows.map(r => ({
      utmCampaign: String(r.utm_campaign ?? "(sin campaña)"),
      utmSource:   r.utm_source != null ? String(r.utm_source) : null,
      visits:      Number(r.visits ?? 0),
      formSubmits: Number(r.form_submits ?? 0),
      conversions: Number(r.conversions ?? 0),
      contacts:    Number(r.contacts ?? 0),
    }));
  }

  async getContactJourney(tenantId: string, contactId: string): Promise<AttributionEvent[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_lead_attribution
       WHERE tenant_id=$1 AND contact_id=$2::uuid
       ORDER BY created_at`,
      [tenantId, contactId],
    );
    return rows.map(rowToEvent);
  }

  async getSummary(tenantId: string, days = 30): Promise<{
    totalVisits: number; totalFormSubmits: number; totalConversions: number;
    totalContacts: number; topSource: string | null;
  }> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT
         COUNT(*) FILTER (WHERE event_type='visit')        AS total_visits,
         COUNT(*) FILTER (WHERE event_type='form_submit')  AS total_form_submits,
         COUNT(*) FILTER (WHERE event_type='conversion')   AS total_conversions,
         COUNT(DISTINCT contact_id) FILTER (WHERE contact_id IS NOT NULL) AS total_contacts
       FROM saas_lead_attribution
       WHERE tenant_id=$1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL`,
      [tenantId, String(days)],
    );
    const topRow = await this.db.query<Record<string, unknown>>(
      `SELECT utm_source FROM saas_lead_attribution
       WHERE tenant_id=$1 AND utm_source IS NOT NULL
         AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY utm_source ORDER BY COUNT(*) DESC LIMIT 1`,
      [tenantId, String(days)],
    );
    const r = rows[0] ?? {};
    return {
      totalVisits:      Number(r.total_visits      ?? 0),
      totalFormSubmits: Number(r.total_form_submits ?? 0),
      totalConversions: Number(r.total_conversions  ?? 0),
      totalContacts:    Number(r.total_contacts     ?? 0),
      topSource: topRow[0] ? String(topRow[0].utm_source) : null,
    };
  }

  /**
   * Multi-touch attribution models.
   * Loads all journeys (contacts with ≥1 conversion) in the window,
   * computes fractional credit per touchpoint using the chosen model,
   * then aggregates by utm_source/utm_medium/utm_campaign.
   */
  async getModelBreakdown(tenantId: string, model: AttributionModel, days = 30): Promise<ModelBreakdown> {
    // Fetch all events in window that belong to contacts who converted
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT e.contact_id, e.utm_source, e.utm_medium, e.utm_campaign,
              e.event_type, e.created_at,
              ROW_NUMBER() OVER (PARTITION BY e.contact_id ORDER BY e.created_at) AS rn_asc,
              COUNT(*) OVER (PARTITION BY e.contact_id) AS total_touches
       FROM saas_lead_attribution e
       WHERE e.tenant_id = $1
         AND e.created_at >= NOW() - ($2 || ' days')::INTERVAL
         AND e.contact_id IN (
           SELECT DISTINCT contact_id FROM saas_lead_attribution
           WHERE tenant_id = $1 AND event_type = 'conversion'
             AND created_at >= NOW() - ($2 || ' days')::INTERVAL
             AND contact_id IS NOT NULL
         )
       ORDER BY e.contact_id, e.created_at`,
      [tenantId, String(days)],
    );

    if (!rows.length) return { model, days, channels: [] };

    // Group events by contact
    const byContact = new Map<string, typeof rows>();
    for (const r of rows) {
      const cid = String(r.contact_id);
      if (!byContact.has(cid)) byContact.set(cid, []);
      byContact.get(cid)!.push(r);
    }

    // credit[key] = { credit, conversions }
    const creditMap = new Map<string, { credit: number; conversions: number; utmSource: string; utmMedium: string | null; utmCampaign: string | null }>();

    const HALF_LIFE_MS = 7 * 86_400_000;

    for (const events of byContact.values()) {
      const touchpoints = events.filter(e => e.event_type !== "conversion");
      if (!touchpoints.length) continue;
      const conversions = events.filter(e => e.event_type === "conversion").length;
      const n = touchpoints.length;

      // Compute raw weights per touchpoint
      const weights: number[] = touchpoints.map((tp, idx) => {
        if (model === "first_touch") return idx === 0 ? 1 : 0;
        if (model === "last_touch") return idx === n - 1 ? 1 : 0;
        if (model === "linear") return 1 / n;
        // time_decay: weight = exp(age / halfLife), normalised
        const lastTs = new Date(events[events.length - 1].created_at as string).getTime();
        const tpTs   = new Date(tp.created_at as string).getTime();
        return Math.exp(-Math.abs(lastTs - tpTs) / HALF_LIFE_MS);
      });

      const totalW = weights.reduce((s, w) => s + w, 0);

      touchpoints.forEach((tp, idx) => {
        const w = totalW > 0 ? weights[idx] / totalW : 0;
        if (w === 0) return;
        const key = `${tp.utm_source ?? "(direct)"}|||${tp.utm_medium ?? ""}|||${tp.utm_campaign ?? ""}`;
        const existing = creditMap.get(key);
        if (existing) {
          existing.credit += w * conversions;
          existing.conversions += conversions;
        } else {
          creditMap.set(key, {
            utmSource: String(tp.utm_source ?? "(direct)"),
            utmMedium: tp.utm_medium != null ? String(tp.utm_medium) : null,
            utmCampaign: tp.utm_campaign != null ? String(tp.utm_campaign) : null,
            credit: w * conversions,
            conversions,
          });
        }
      });
    }

    const channels = Array.from(creditMap.values())
      .sort((a, b) => b.credit - a.credit)
      .map(c => ({ ...c, credit: Math.round(c.credit * 1000) / 1000 }));

    return { model, days, channels };
  }
}

let _svc: SaasAttributionService | undefined;
export function getSaasAttributionService(): SaasAttributionService {
  _svc ??= new SaasAttributionService();
  return _svc;
}
export function resetSaasAttributionServiceForTests(): void { _svc = undefined; }
