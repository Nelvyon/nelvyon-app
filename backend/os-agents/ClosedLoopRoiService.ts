import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { getGoogleAdsService } from "../integrations/GoogleAdsService";
import { getMetaAdsService } from "../integrations/MetaAdsService";
import type { ConversionEvent } from "../integrations/MetaAdsService";
import { getTelegramService } from "../integrations/TelegramService";
import { getWhatsAppService } from "../integrations/WhatsAppService";
import { OsAgentError } from "./OsAgentError";

export interface RoiEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: string;
  channel: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RoiConversion {
  id: string;
  userId: string;
  sessionId: string;
  revenue: number;
  conversionType: string | null;
  attributedChannel: string | null;
  attributedSource: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RoiMetrics {
  totalSpend: number;
  totalRevenue: number;
  roiPercentage: number;
  conversions: number;
  costPerConversion: number;
}

export interface RoiLoop {
  id: string;
  userId: string;
  status: string;
  totalSpend: number;
  totalRevenue: number;
  roiPercentage: number;
  loopStart: string;
  loopEnd: string | null;
  metadata: Record<string, unknown>;
}

type ContactData = {
  recipient?: string;
  templateName?: string;
  languageCode?: string;
  components?: ReadonlyArray<Record<string, unknown>>;
  text?: string;
  chatId?: string;
  email?: string;
  subject?: string;
};

type GoogleLike = {
  getAccountSummary: (userId: string) => Promise<{ totalSpend: number }>;
  reportConversion?: (userId: string, payload: Record<string, unknown>) => Promise<unknown>;
  sendConversionEvent?: (userId: string, payload: Record<string, unknown>) => Promise<unknown>;
};

type MetaLike = {
  getAccountSummary: (userId: string) => Promise<{ totalSpend: number }>;
  sendConversionEvent: (userId: string, event: ConversionEvent) => Promise<unknown>;
};

type WhatsAppLike = {
  sendTemplateMessage: (
    userId: string,
    recipient: string,
    templateName: string,
    languageCode: string,
    components: ReadonlyArray<Record<string, unknown>>,
  ) => Promise<unknown>;
};

type TelegramLike = {
  sendMessage: (userId: string, text: string, chatId?: string) => Promise<unknown>;
};

export type ClosedLoopRoiServiceDeps = {
  db?: Pick<DbClient, "query">;
  googleAdsService?: GoogleLike;
  metaAdsService?: MetaLike;
  whatsAppService?: WhatsAppLike;
  telegramService?: TelegramLike;
};

function asNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export class ClosedLoopRoiService {
  constructor(private readonly deps: ClosedLoopRoiServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get googleAds(): GoogleLike {
    return this.deps.googleAdsService ?? (getGoogleAdsService() as unknown as GoogleLike);
  }

  private get metaAds(): MetaLike {
    return this.deps.metaAdsService ?? (getMetaAdsService() as unknown as MetaLike);
  }

  private get whatsApp(): WhatsAppLike {
    return this.deps.whatsAppService ?? (getWhatsAppService() as unknown as WhatsAppLike);
  }

  private get telegram(): TelegramLike {
    return this.deps.telegramService ?? (getTelegramService() as unknown as TelegramLike);
  }

  async trackEvent(
    userId: string,
    sessionId: string,
    eventType: string,
    channel: string | null,
    source: string | null,
    metadata: Record<string, unknown>,
  ): Promise<RoiEvent> {
    const rows = await this.db.query<{
      id: string;
      userId: string;
      sessionId: string;
      eventType: string;
      channel: string | null;
      source: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: Date | string;
    }>(
      `INSERT INTO roi_events (user_id, session_id, event_type, channel, source, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb)
       RETURNING id::text as id,
         user_id::text as "userId",
         session_id::text as "sessionId",
         event_type as "eventType",
         channel,
         source,
         metadata,
         created_at as "createdAt"`,
      [userId, sessionId, eventType, channel, source, JSON.stringify(metadata ?? {})],
    );
    const row = rows[0];
    return {
      id: row.id,
      userId: row.userId,
      sessionId: row.sessionId,
      eventType: row.eventType,
      channel: row.channel,
      source: row.source,
      metadata: asObj(row.metadata),
      createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    };
  }

  async trackConversion(
    userId: string,
    sessionId: string,
    revenue: number,
    conversionType: string,
    channel: string | null,
    source: string | null,
    metadata: Record<string, unknown>,
  ): Promise<RoiConversion> {
    const rows = await this.db.query<{
      id: string;
      userId: string;
      sessionId: string;
      revenue: string | number;
      conversionType: string | null;
      attributedChannel: string | null;
      attributedSource: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: Date | string;
    }>(
      `INSERT INTO roi_conversions
        (user_id, session_id, revenue, conversion_type, attributed_channel, attributed_source, metadata)
       VALUES ($1::uuid, $2::uuid, $3::numeric, $4, $5, $6, $7::jsonb)
       RETURNING id::text as id,
         user_id::text as "userId",
         session_id::text as "sessionId",
         revenue,
         conversion_type as "conversionType",
         attributed_channel as "attributedChannel",
         attributed_source as "attributedSource",
         metadata,
         created_at as "createdAt"`,
      [userId, sessionId, revenue, conversionType, channel, source, JSON.stringify(metadata ?? {})],
    );
    const row = rows[0];
    const out: RoiConversion = {
      id: row.id,
      userId: row.userId,
      sessionId: row.sessionId,
      revenue: asNum(row.revenue),
      conversionType: row.conversionType,
      attributedChannel: row.attributedChannel,
      attributedSource: row.attributedSource,
      metadata: asObj(row.metadata),
      createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    };
    await this.sendConversionFeedback(userId, channel, {
      sessionId,
      revenue: out.revenue,
      conversionType: out.conversionType ?? "conversion",
      source: out.attributedSource ?? source ?? "",
      metadata: out.metadata,
    });
    return out;
  }

  async sendConversionFeedback(
    userId: string,
    channel: string | null,
    conversionData: { sessionId: string; revenue: number; conversionType: string; source: string; metadata: Record<string, unknown> },
  ): Promise<void> {
    if (channel === "google_ads") {
      const payload = {
        sessionId: conversionData.sessionId,
        value: conversionData.revenue,
        conversionType: conversionData.conversionType,
        source: conversionData.source,
        metadata: conversionData.metadata,
      };
      const google = this.googleAds as GoogleLike;
      if (typeof google.reportConversion === "function") {
        await google.reportConversion(userId, payload);
      } else if (typeof google.sendConversionEvent === "function") {
        await google.sendConversionEvent(userId, payload);
      } else {
        await this.trackEvent(userId, conversionData.sessionId, "conversion_feedback_queued", channel, conversionData.source, payload);
      }
      return;
    }
    if (channel === "meta_ads") {
      await this.metaAds.sendConversionEvent(userId, {
        eventName: conversionData.conversionType || "Purchase",
        eventTime: Date.now() / 1000,
        userData: {},
        customData: {
          value: conversionData.revenue,
          currency: "USD",
          source: conversionData.source,
          ...conversionData.metadata,
        },
      });
    }
  }

  async startNurturingSequence(userId: string, sessionId: string, contactData: ContactData, channel: string): Promise<void> {
    if (channel === "whatsapp") {
      const recipient = String(contactData.recipient ?? "").trim();
      const templateName = String(contactData.templateName ?? "nurturing_followup").trim();
      const languageCode = String(contactData.languageCode ?? "es").trim();
      const components = Array.isArray(contactData.components) ? contactData.components : [];
      if (!recipient) throw new OsAgentError("recipient es requerido para WhatsApp", "roi_validation");
      await this.whatsApp.sendTemplateMessage(userId, recipient, templateName, languageCode, components);
      await this.trackEvent(userId, sessionId, "nurturing_sent", "whatsapp", "closed_loop_roi", { recipient, templateName, languageCode });
      return;
    }
    if (channel === "telegram") {
      const text = String(contactData.text ?? "Gracias por tu interés. Te contactamos pronto.").trim();
      const chatId = typeof contactData.chatId === "string" ? contactData.chatId.trim() : undefined;
      await this.telegram.sendMessage(userId, text, chatId);
      await this.trackEvent(userId, sessionId, "nurturing_sent", "telegram", "closed_loop_roi", { chatId: chatId ?? "", text });
      return;
    }
    if (channel === "email") {
      const email = String(contactData.email ?? "").trim();
      const subject = String(contactData.subject ?? "Seguimiento de tu solicitud").trim();
      const text = String(contactData.text ?? "Gracias por contactar. Te acompañamos en el siguiente paso.").trim();
      await this.trackEvent(userId, sessionId, "nurturing_queued", "email", "closed_loop_roi", {
        email,
        subject,
        text,
        status: "pending_send",
      });
      return;
    }
    throw new OsAgentError("channel de nurturing no soportado", "roi_validation");
  }

  async getRoiMetrics(userId: string, dateRange?: { start: string; end: string }): Promise<RoiMetrics> {
    const whereDate =
      dateRange?.start && dateRange?.end ? "AND created_at BETWEEN $2::timestamptz AND $3::timestamptz" : "";
    const params =
      dateRange?.start && dateRange?.end ? [userId, dateRange.start, dateRange.end] : [userId];
    const revRows = await this.db.query<{ total_revenue: string; conversions: string }>(
      `SELECT
         COALESCE(SUM(revenue), 0)::text as total_revenue,
         COUNT(*)::text as conversions
       FROM roi_conversions
       WHERE user_id = $1::uuid ${whereDate}`,
      params,
    );
    const totalRevenue = asNum(revRows[0]?.total_revenue);
    const conversions = Math.trunc(asNum(revRows[0]?.conversions));

    let googleSpend = 0;
    let metaSpend = 0;
    try {
      googleSpend = asNum((await this.googleAds.getAccountSummary(userId)).totalSpend);
    } catch (e: unknown) {
      if (!(e instanceof OsAgentError) || (e.code !== "google_ads_auth" && e.code !== "google_ads_config")) throw e;
    }
    try {
      metaSpend = asNum((await this.metaAds.getAccountSummary(userId)).totalSpend);
    } catch (e: unknown) {
      if (!(e instanceof OsAgentError) || e.code !== "meta_ads_auth") throw e;
    }

    const totalSpend = googleSpend + metaSpend;
    const roiPercentage = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
    const costPerConversion = conversions > 0 ? totalSpend / conversions : 0;
    return { totalSpend, totalRevenue, roiPercentage, conversions, costPerConversion };
  }

  async getSessionJourney(userId: string, sessionId: string): Promise<RoiEvent[]> {
    const rows = await this.db.query<{
      id: string;
      userId: string;
      sessionId: string;
      eventType: string;
      channel: string | null;
      source: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: Date | string;
    }>(
      `SELECT id::text as id,
          user_id::text as "userId",
          session_id::text as "sessionId",
          event_type as "eventType",
          channel,
          source,
          metadata,
          created_at as "createdAt"
       FROM roi_events
       WHERE user_id = $1::uuid AND session_id = $2::uuid
       ORDER BY created_at ASC`,
      [userId, sessionId],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      sessionId: r.sessionId,
      eventType: r.eventType,
      channel: r.channel,
      source: r.source,
      metadata: asObj(r.metadata),
      createdAt: typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
    }));
  }

  async createLoop(userId: string): Promise<RoiLoop> {
    const rows = await this.db.query<{
      id: string;
      userId: string;
      status: string;
      totalSpend: string | number;
      totalRevenue: string | number;
      roiPercentage: string | number;
      loopStart: Date | string;
      loopEnd: Date | string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `INSERT INTO roi_loops (user_id, status, total_spend, total_revenue, roi_percentage, metadata)
       VALUES ($1::uuid, 'active', 0, 0, 0, $2::jsonb)
       RETURNING id::text as id,
         user_id::text as "userId",
         status,
         total_spend as "totalSpend",
         total_revenue as "totalRevenue",
         roi_percentage as "roiPercentage",
         loop_start as "loopStart",
         loop_end as "loopEnd",
         metadata`,
      [userId, JSON.stringify({ source: "closed_loop_roi" })],
    );
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId,
      status: r.status,
      totalSpend: asNum(r.totalSpend),
      totalRevenue: asNum(r.totalRevenue),
      roiPercentage: asNum(r.roiPercentage),
      loopStart: typeof r.loopStart === "string" ? r.loopStart : r.loopStart.toISOString(),
      loopEnd: r.loopEnd ? (typeof r.loopEnd === "string" ? r.loopEnd : r.loopEnd.toISOString()) : null,
      metadata: asObj(r.metadata),
    };
  }

  async closeLoop(loopId: string, userId: string): Promise<RoiLoop> {
    const metrics = await this.getRoiMetrics(userId);
    const roi = metrics.totalSpend > 0 ? ((metrics.totalRevenue - metrics.totalSpend) / metrics.totalSpend) * 100 : 0;
    const rows = await this.db.query<{
      id: string;
      userId: string;
      status: string;
      totalSpend: string | number;
      totalRevenue: string | number;
      roiPercentage: string | number;
      loopStart: Date | string;
      loopEnd: Date | string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `UPDATE roi_loops
       SET status = 'closed',
         total_spend = $3::numeric,
         total_revenue = $4::numeric,
         roi_percentage = $5::numeric,
         loop_end = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid
       RETURNING id::text as id,
         user_id::text as "userId",
         status,
         total_spend as "totalSpend",
         total_revenue as "totalRevenue",
         roi_percentage as "roiPercentage",
         loop_start as "loopStart",
         loop_end as "loopEnd",
         metadata`,
      [loopId, userId, metrics.totalSpend, metrics.totalRevenue, roi],
    );
    const r = rows[0];
    if (!r) throw new OsAgentError("Loop no encontrado", "roi_not_found");
    return {
      id: r.id,
      userId: r.userId,
      status: r.status,
      totalSpend: asNum(r.totalSpend),
      totalRevenue: asNum(r.totalRevenue),
      roiPercentage: asNum(r.roiPercentage),
      loopStart: typeof r.loopStart === "string" ? r.loopStart : r.loopStart.toISOString(),
      loopEnd: r.loopEnd ? (typeof r.loopEnd === "string" ? r.loopEnd : r.loopEnd.toISOString()) : null,
      metadata: asObj(r.metadata),
    };
  }
}

let cachedClosedLoopRoiService: ClosedLoopRoiService | undefined;

export function getClosedLoopRoiService(): ClosedLoopRoiService {
  if (!cachedClosedLoopRoiService) cachedClosedLoopRoiService = new ClosedLoopRoiService();
  return cachedClosedLoopRoiService;
}

export function resetClosedLoopRoiServiceForTests(): void {
  cachedClosedLoopRoiService = undefined;
}
