import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { getGoogleAdsService } from "../integrations/GoogleAdsService";
import { getMetaAdsService } from "../integrations/MetaAdsService";
import { getWhatsAppService } from "../integrations/WhatsAppService";
import type { ILlmClient } from "./LlmClient";
import { LlmClient } from "./LlmClient";

const MODEL = "gpt-4o";
const TEMP = 0.2;
const MAX_TOKENS = 500;

export type ContactData = {
  contactId: string;
  email?: string;
  phone?: string;
  name?: string;
};

export type IntentScore = {
  score: number;
  intentLevel: "low" | "medium" | "high";
  reasoning: string;
};

export type IntentSignal = {
  id: string;
  userId: string;
  contactId: string;
  signalType: string;
  channel: string;
  score: number;
  metadata: Record<string, unknown>;
  detectedAt: string;
};

export type IntentAction = {
  id: string;
  userId: string;
  signalId: string;
  actionType: string;
  channel: string;
  status: string;
  executedAt: string | null;
  metadata: Record<string, unknown>;
};

export type IntentActionResult = {
  triggered: string[];
  skipped: string[];
  total: number;
};

export type IntentSummary = {
  totalSignals: number;
  highIntentCount: number;
  actionsTriggered: number;
  conversionRate: number;
};

type GoogleLike = {
  getCredentials: (userId: string) => Promise<unknown | null>;
};
type MetaLike = {
  getCredentials: (userId: string) => Promise<unknown | null>;
  sendConversionEvent: (userId: string, event: Record<string, unknown>) => Promise<unknown>;
};
type WhatsAppLike = {
  getCredentials: (userId: string) => Promise<unknown | null>;
  sendTextMessage: (userId: string, recipient: string, message: string) => Promise<unknown>;
};

export type IntentMulticanalServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
  googleAdsService?: GoogleLike;
  metaAdsService?: MetaLike;
  whatsAppService?: WhatsAppLike;
};

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function parseNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseIntentPayload(raw: string): IntentScore {
  let score = 0;
  let reasoning = raw.trim();
  try {
    const parsed = JSON.parse(raw) as { score?: unknown; intentLevel?: unknown; reasoning?: unknown };
    score = Math.max(0, Math.min(100, Math.round(parseNum(parsed.score))));
    reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : reasoning;
  } catch {
    const m = /(\d{1,3})/.exec(raw);
    if (m?.[1]) score = Math.max(0, Math.min(100, Number(m[1])));
  }
  const intentLevel: IntentScore["intentLevel"] = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  return { score, intentLevel, reasoning };
}

export class IntentMulticanalService {
  constructor(private readonly deps: IntentMulticanalServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
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

  async detectIntent(userId: string, contactData: ContactData, behaviorSignals: string[]): Promise<IntentScore> {
    const prompt = `Analiza intención de compra en escala 0-100.
Contacto: ${JSON.stringify(contactData)}
Señales: ${JSON.stringify(behaviorSignals)}
Responde SOLO JSON: {"score": number, "reasoning": string}`;
    const out = await this.llm.complete(prompt, {
      model: MODEL,
      temperature: TEMP,
      maxTokens: MAX_TOKENS,
    });
    return parseIntentPayload(out);
  }

  private async insertAction(
    userId: string,
    signalId: string,
    actionType: string,
    channel: string,
    status: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO intent_actions (user_id, signal_id, action_type, channel, status, executed_at, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, CASE WHEN $5 = 'executed' THEN NOW() ELSE NULL END, $6::jsonb)`,
      [userId, signalId, actionType, channel, status, JSON.stringify(metadata ?? {})],
    );
  }

  async triggerMulticanalResponse(userId: string, contactData: ContactData, intentScore: IntentScore): Promise<IntentActionResult> {
    const signalId = (contactData as { signalId?: string }).signalId ?? "00000000-0000-0000-0000-000000000000";
    const triggered: string[] = [];
    const skipped: string[] = [];

    if (intentScore.score < 70) return { triggered, skipped: ["intent_below_threshold"], total: 0 };

    await this.insertAction(userId, signalId, "nurture_email", "email", "executed", { contactId: contactData.contactId });
    triggered.push("email");

    const gCred = await this.googleAds.getCredentials(userId);
    if (gCred) {
      await this.insertAction(userId, signalId, "retargeting", "google_ads", "executed", { contactId: contactData.contactId });
      triggered.push("google_ads");
    } else {
      await this.insertAction(userId, signalId, "retargeting", "google_ads", "skipped", { reason: "no_credentials" });
      skipped.push("google_ads");
    }

    const mCred = await this.metaAds.getCredentials(userId);
    if (mCred) {
      await this.metaAds.sendConversionEvent(userId, {
        eventName: "HighIntentLead",
        eventTime: Math.floor(Date.now() / 1000),
        userData: {},
        customData: { contactId: contactData.contactId, score: intentScore.score },
      });
      await this.insertAction(userId, signalId, "retargeting", "meta_ads", "executed", { contactId: contactData.contactId });
      triggered.push("meta_ads");
    } else {
      await this.insertAction(userId, signalId, "retargeting", "meta_ads", "skipped", { reason: "no_credentials" });
      skipped.push("meta_ads");
    }

    const wCred = await this.whatsApp.getCredentials(userId);
    if (wCred && contactData.phone) {
      await this.whatsApp.sendTextMessage(userId, contactData.phone, "Te ayudamos con tu siguiente paso. ¿Agendamos?");
      await this.insertAction(userId, signalId, "outreach", "whatsapp", "executed", { phone: contactData.phone });
      triggered.push("whatsapp");
    } else {
      await this.insertAction(userId, signalId, "outreach", "whatsapp", "skipped", { reason: "no_credentials_or_phone" });
      skipped.push("whatsapp");
    }

    await this.insertAction(userId, signalId, "sync", "crm", "executed", { contactId: contactData.contactId });
    triggered.push("crm");

    return { triggered, skipped, total: triggered.length + skipped.length };
  }

  async processSignal(
    userId: string,
    contactId: string,
    signalType: string,
    channel: string,
    metadata: Record<string, unknown>,
  ): Promise<IntentSignal> {
    const behaviorSignals = Array.isArray(metadata.behaviorSignals) ? metadata.behaviorSignals.map((s) => String(s)) : [];
    const scoreOut = await this.detectIntent(userId, { contactId, ...asObj(metadata.contactData) }, behaviorSignals);

    const rows = await this.db.query<{
      id: string;
      userId: string;
      contactId: string;
      signalType: string;
      channel: string;
      score: number;
      metadata: Record<string, unknown> | null;
      detectedAt: Date | string;
    }>(
      `INSERT INTO intent_signals (user_id, contact_id, signal_type, channel, score, metadata)
       VALUES ($1::uuid, $2, $3, $4, $5::int, $6::jsonb)
       RETURNING id::text as id,
         user_id::text as "userId",
         contact_id as "contactId",
         signal_type as "signalType",
         channel,
         score,
         metadata,
         detected_at as "detectedAt"`,
      [userId, contactId, signalType, channel, scoreOut.score, JSON.stringify(metadata ?? {})],
    );
    const r = rows[0];
    const signal: IntentSignal = {
      id: r.id,
      userId: r.userId,
      contactId: r.contactId,
      signalType: r.signalType,
      channel: r.channel,
      score: r.score,
      metadata: asObj(r.metadata),
      detectedAt: typeof r.detectedAt === "string" ? r.detectedAt : r.detectedAt.toISOString(),
    };
    if (scoreOut.intentLevel === "high") {
      const contactMerged = asObj(metadata.contactData) as ContactData;
      await this.triggerMulticanalResponse(
        userId,
        {
          ...contactMerged,
          contactId,
          signalId: signal.id,
        } as ContactData & { signalId: string },
        scoreOut,
      );
    }
    return signal;
  }

  async getIntentHistory(userId: string, contactId?: string): Promise<IntentSignal[]> {
    const rows = contactId
      ? await this.db.query<any>(
          `SELECT id::text as id, user_id::text as "userId", contact_id as "contactId", signal_type as "signalType",
             channel, score, metadata, detected_at as "detectedAt"
           FROM intent_signals
           WHERE user_id = $1::uuid AND contact_id = $2
           ORDER BY detected_at DESC`,
          [userId, contactId],
        )
      : await this.db.query<any>(
          `SELECT id::text as id, user_id::text as "userId", contact_id as "contactId", signal_type as "signalType",
             channel, score, metadata, detected_at as "detectedAt"
           FROM intent_signals
           WHERE user_id = $1::uuid
           ORDER BY detected_at DESC`,
          [userId],
        );
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      contactId: r.contactId,
      signalType: r.signalType,
      channel: r.channel,
      score: parseNum(r.score),
      metadata: asObj(r.metadata),
      detectedAt: typeof r.detectedAt === "string" ? r.detectedAt : r.detectedAt.toISOString(),
    }));
  }

  async getActionHistory(userId: string, signalId?: string): Promise<IntentAction[]> {
    const rows = signalId
      ? await this.db.query<any>(
          `SELECT id::text as id, user_id::text as "userId", signal_id::text as "signalId", action_type as "actionType",
             channel, status, executed_at as "executedAt", metadata
           FROM intent_actions
           WHERE user_id = $1::uuid AND signal_id = $2::uuid
           ORDER BY id DESC`,
          [userId, signalId],
        )
      : await this.db.query<any>(
          `SELECT id::text as id, user_id::text as "userId", signal_id::text as "signalId", action_type as "actionType",
             channel, status, executed_at as "executedAt", metadata
           FROM intent_actions
           WHERE user_id = $1::uuid
           ORDER BY id DESC`,
          [userId],
        );
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      signalId: r.signalId,
      actionType: r.actionType,
      channel: r.channel,
      status: r.status,
      executedAt: r.executedAt ? (typeof r.executedAt === "string" ? r.executedAt : r.executedAt.toISOString()) : null,
      metadata: asObj(r.metadata),
    }));
  }

  async getIntentSummary(userId: string): Promise<IntentSummary> {
    const signalRows = await this.db.query<{ total_signals: string; high_intent_count: string }>(
      `SELECT COUNT(*)::text as total_signals,
         COALESCE(SUM(CASE WHEN score >= 70 THEN 1 ELSE 0 END), 0)::text as high_intent_count
       FROM intent_signals
       WHERE user_id = $1::uuid`,
      [userId],
    );
    const actionRows = await this.db.query<{ actions_triggered: string }>(
      `SELECT COUNT(*)::text as actions_triggered
       FROM intent_actions
       WHERE user_id = $1::uuid AND status = 'executed'`,
      [userId],
    );
    const totalSignals = Math.trunc(parseNum(signalRows[0]?.total_signals));
    const highIntentCount = Math.trunc(parseNum(signalRows[0]?.high_intent_count));
    const actionsTriggered = Math.trunc(parseNum(actionRows[0]?.actions_triggered));
    const conversionRate = totalSignals > 0 ? (highIntentCount / totalSignals) * 100 : 0;
    return { totalSignals, highIntentCount, actionsTriggered, conversionRate };
  }
}

let cachedIntentMulticanalService: IntentMulticanalService | undefined;

export function getIntentMulticanalService(): IntentMulticanalService {
  if (!cachedIntentMulticanalService) cachedIntentMulticanalService = new IntentMulticanalService();
  return cachedIntentMulticanalService;
}

export function resetIntentMulticanalServiceForTests(): void {
  cachedIntentMulticanalService = undefined;
}
