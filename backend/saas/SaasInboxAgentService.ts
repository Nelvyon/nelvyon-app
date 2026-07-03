/**
 * S57 — SaasInboxAgentService
 * Multi-tenant inbox AI: suggest + optional auto-reply using Nelvyon agent skills.
 * Uses gpt-4o-mini when OPENAI_API_KEY is set; rule-based mock otherwise (0€ dev).
 */
import type { ILlmClient } from "../os-agents/LlmClient";
import { LlmClient } from "../os-agents/LlmClient";

import { buildMockAgentReply } from "./nelvyonAgentMockReplies";
import {
  pickSkillForMessage,
  resolveSkillsForChannel,
  type NelvyonAgentSkill,
} from "./nelvyonAgentSkillsCatalog";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import type { SaasInboxService, SaasMessage } from "./SaasInboxService";

export type InboxAgentSettings = {
  tenantId: string;
  enabled: boolean;
  autoReplyEnabled: boolean;
  autoReplyMinConfidence: number;
  systemPrompt: string | null;
  escalateKeywords: string[];
  activeSkillIds: string[];
  speakResponses: boolean;
  updatedAt: string;
};

export type SuggestReplyResult = {
  suggestion: string;
  confidence: number;
  skillId: string;
  skillName: string;
  escalated: boolean;
  mock: boolean;
  suggestionId?: string;
};

export type HandleInboundResult = {
  processed: boolean;
  suggested?: SuggestReplyResult;
  autoReplied?: boolean;
  reason?: string;
};

export type SaasInboxAgentErrorCode = "NOT_FOUND" | "VALIDATION" | "DISABLED";

export class SaasInboxAgentError extends Error {
  constructor(
    message: string,
    public readonly code: SaasInboxAgentErrorCode,
  ) {
    super(message);
    this.name = "SaasInboxAgentError";
  }
}

type SettingsRow = {
  tenant_id: string;
  enabled: boolean;
  auto_reply_enabled: boolean;
  auto_reply_min_confidence: string | number;
  system_prompt: string | null;
  escalate_keywords: string[] | null;
  active_skill_ids: string[] | null;
  speak_responses: boolean;
  updated_at: Date | string;
};

const DEFAULT_SETTINGS: Omit<InboxAgentSettings, "tenantId" | "updatedAt"> = {
  enabled: false,
  autoReplyEnabled: false,
  autoReplyMinConfidence: 0.85,
  systemPrompt: null,
  escalateKeywords: ["abogado", "demanda", "reembolso", "denuncia"],
  activeSkillIds: ["inbox_support", "crm_assist", "nelvyon_services"],
  speakResponses: true,
};

function rowToSettings(r: SettingsRow): InboxAgentSettings {
  return {
    tenantId: r.tenant_id,
    enabled: !!r.enabled,
    autoReplyEnabled: !!r.auto_reply_enabled,
    autoReplyMinConfidence: Number(r.auto_reply_min_confidence) || 0.85,
    systemPrompt: r.system_prompt,
    escalateKeywords: r.escalate_keywords ?? DEFAULT_SETTINGS.escalateKeywords,
    activeSkillIds: r.active_skill_ids ?? DEFAULT_SETTINGS.activeSkillIds,
    speakResponses: r.speak_responses !== false,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function shouldEscalate(text: string, keywords: string[]): boolean {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return keywords.some((k) => norm.includes(k.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")));
}

function formatHistory(messages: SaasMessage[]): string {
  return messages
    .slice(-12)
    .map((m) => {
      const who = m.direction === "inbound" ? "Cliente" : "Agente";
      return `${who}: ${m.body}`;
    })
    .join("\n");
}

function mockSuggestion(skill: NelvyonAgentSkill, inbound: string, escalated: boolean): string {
  return buildMockAgentReply(skill, inbound, escalated);
}

export type SaasInboxAgentDeps = {
  db?: SaasPostgresPort;
  inbox?: SaasInboxService;
  llm?: ILlmClient | null;
};

let _instance: SaasInboxAgentService | null = null;

export function getSaasInboxAgentService(): SaasInboxAgentService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new SaasInboxAgentService({ db: DbClient.getInstance() });
  }
  return _instance;
}

export function resetSaasInboxAgentServiceForTests(): void {
  _instance = null;
}

export class SaasInboxAgentService {
  private readonly db: SaasPostgresPort;
  private readonly inbox: SaasInboxService;
  private readonly llm: ILlmClient | null;

  constructor(deps: SaasInboxAgentDeps = {}) {
    if (deps.db) this.db = deps.db;
    else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
      this.db = DbClient.getInstance();
    }
    this.inbox = deps.inbox ?? this.lazyInbox();
    this.llm = deps.llm === undefined ? this.resolveLlm() : deps.llm;
  }

  private lazyInbox(): SaasInboxService {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSaasInboxService } = require("./SaasInboxService") as typeof import("./SaasInboxService");
    return getSaasInboxService();
  }

  private resolveLlm(): ILlmClient | null {
    try {
      if (!process.env.OPENAI_API_KEY?.trim()) return null;
      return LlmClient.getInstance();
    } catch {
      return null;
    }
  }

  async getSettings(tenantId: string): Promise<InboxAgentSettings> {
    const rows = await this.db.query<SettingsRow>(
      `SELECT * FROM saas_inbox_agent_settings WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    if (!rows[0]) {
      return { tenantId, ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
    }
    return rowToSettings(rows[0]);
  }

  async updateSettings(
    tenantId: string,
    patch: Partial<Omit<InboxAgentSettings, "tenantId" | "updatedAt">>,
  ): Promise<InboxAgentSettings> {
    const cur = await this.getSettings(tenantId);
    const next = {
      enabled: patch.enabled ?? cur.enabled,
      autoReplyEnabled: patch.autoReplyEnabled ?? cur.autoReplyEnabled,
      autoReplyMinConfidence: patch.autoReplyMinConfidence ?? cur.autoReplyMinConfidence,
      systemPrompt: patch.systemPrompt !== undefined ? patch.systemPrompt : cur.systemPrompt,
      escalateKeywords: patch.escalateKeywords ?? cur.escalateKeywords,
      activeSkillIds: patch.activeSkillIds ?? cur.activeSkillIds,
      speakResponses: patch.speakResponses ?? cur.speakResponses,
    };
    const rows = await this.db.query<SettingsRow>(
      `INSERT INTO saas_inbox_agent_settings
         (tenant_id, enabled, auto_reply_enabled, auto_reply_min_confidence,
          system_prompt, escalate_keywords, active_skill_ids, speak_responses, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         auto_reply_enabled = EXCLUDED.auto_reply_enabled,
         auto_reply_min_confidence = EXCLUDED.auto_reply_min_confidence,
         system_prompt = EXCLUDED.system_prompt,
         escalate_keywords = EXCLUDED.escalate_keywords,
         active_skill_ids = EXCLUDED.active_skill_ids,
         speak_responses = EXCLUDED.speak_responses,
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId,
        next.enabled,
        next.autoReplyEnabled,
        next.autoReplyMinConfidence,
        next.systemPrompt,
        next.escalateKeywords,
        next.activeSkillIds,
        next.speakResponses,
      ],
    );
    return rowToSettings(rows[0]!);
  }

  async suggestReply(
    tenantId: string,
    conversationId: string,
    inboundBody?: string,
  ): Promise<SuggestReplyResult> {
    const settings = await this.getSettings(tenantId);
    if (!settings.enabled) {
      throw new SaasInboxAgentError("Inbox agent disabled", "DISABLED");
    }

    const conv = await this.inbox.getConversation(tenantId, conversationId);
    if (!conv) throw new SaasInboxAgentError("Conversation not found", "NOT_FOUND");

    const messages = await this.inbox.listMessages(tenantId, conversationId);
    const lastInbound =
      inboundBody?.trim() ||
      [...messages].reverse().find((m) => m.direction === "inbound")?.body ||
      "";
    if (!lastInbound) throw new SaasInboxAgentError("No inbound message to reply to", "VALIDATION");

    const escalated = shouldEscalate(lastInbound, settings.escalateKeywords);
    const skills = resolveSkillsForChannel(conv.channel, settings.activeSkillIds);
    const skill = pickSkillForMessage(lastInbound, skills);

    let suggestion: string;
    let confidence: number;
    let mock = true;

    if (escalated) {
      suggestion = mockSuggestion(skill, lastInbound, true);
      confidence = 0.95;
    } else if (this.llm) {
      const history = formatHistory(messages);
      const { getSaasTenantMemoryService } = await import("./SaasTenantMemoryService");
      const memBlock = await getSaasTenantMemoryService().buildContextBlock(tenantId, 2000);
      const extra =
        (settings.systemPrompt?.trim() ? `\nInstrucciones tenant: ${settings.systemPrompt}` : "") +
        (memBlock ? `\n\n${memBlock}` : "");
      const prompt =
        `${skill.systemPrompt}${extra}\n\nCanal: ${conv.channel}\nSkill: ${skill.name}\n\n` +
        `Historial:\n${history}\n\nRedacta UNA respuesta lista para enviar (máx 120 palabras, español):`;
      try {
        suggestion = (
          await this.llm.complete(prompt, {
            model: process.env.AUTONOMOUS_OPENAI_MODEL?.trim() || "gpt-4o-mini",
            maxTokens: 400,
            temperature: 0.35,
          })
        ).trim();
        confidence = 0.88;
        mock = false;
      } catch {
        suggestion = mockSuggestion(skill, lastInbound, false);
        confidence = 0.75;
      }
    } else {
      suggestion = mockSuggestion(skill, lastInbound, false);
      confidence = 0.78;
    }

    const logRows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_inbox_agent_suggestions
         (tenant_id, conversation_id, suggested_body, confidence, skill_id, escalated)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [tenantId, conversationId, suggestion, confidence, skill.id, escalated],
    );

    return {
      suggestion,
      confidence,
      skillId: skill.id,
      skillName: skill.name,
      escalated,
      mock,
      suggestionId: logRows[0]?.id,
    };
  }

  /** After inbound message — suggest and optionally auto-send reply. */
  async handleInbound(
    tenantId: string,
    conversationId: string,
    inboundBody: string,
  ): Promise<HandleInboundResult> {
    const settings = await this.getSettings(tenantId);
    if (!settings.enabled) {
      return { processed: false, reason: "agent_disabled" };
    }

    let suggested: SuggestReplyResult;
    try {
      suggested = await this.suggestReply(tenantId, conversationId, inboundBody);
    } catch (e) {
      return { processed: false, reason: e instanceof Error ? e.message : "suggest_failed" };
    }

    if (suggested.escalated || !settings.autoReplyEnabled) {
      return { processed: true, suggested, autoReplied: false, reason: suggested.escalated ? "escalated" : "auto_reply_off" };
    }

    if (suggested.confidence < settings.autoReplyMinConfidence) {
      return { processed: true, suggested, autoReplied: false, reason: "low_confidence" };
    }

    const { getSaasAutonomyService } = await import("./SaasAutonomyService");
    const autonomy = await getSaasAutonomyService().getMode(tenantId);
    const gate = getSaasAutonomyService().gateAgentAuto(autonomy);
    if (!gate.allowed) {
      return { processed: true, suggested, autoReplied: false, reason: gate.reason ?? "autonomy_gate" };
    }

    await this.inbox.replyToConversation(tenantId, conversationId, suggested.suggestion);
    if (suggested.suggestionId) {
      await this.db.query(
        `UPDATE saas_inbox_agent_suggestions SET auto_sent = true WHERE id = $1`,
        [suggested.suggestionId],
      ).catch(() => null);
    }

    return { processed: true, suggested, autoReplied: true };
  }
}
