/**
 * Voice v2 — LLM fallback when deterministic phrase matching fails.
 * Uses gpt-4o-mini JSON intent (cheap). Skipped when no OPENAI_API_KEY.
 */
import type { ILlmClient } from "../os-agents/LlmClient";
import { LlmClient } from "../os-agents/LlmClient";

import type { VoiceCatalogItem, VoiceCommandResult, VoiceIntent } from "./SaasVoiceCommandService";
import { normalizeTranscript } from "./SaasVoiceCommandService";

export type VoiceLlmParsePort = {
  isAvailable(): boolean;
  parse(transcript: string, catalog: VoiceCatalogItem[]): Promise<VoiceCommandResult | null>;
};

function extractJson(text: string): string {
  const t = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(t);
  if (fenced?.[1]) return fenced[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export function createVoiceLlmParser(llm?: ILlmClient | null): VoiceLlmParsePort {
  let client: ILlmClient | null = llm === undefined ? null : llm;
  if (llm === undefined) {
    try {
      if (process.env.OPENAI_API_KEY?.trim()) client = LlmClient.getInstance();
    } catch {
      client = null;
    }
  }

  return {
    isAvailable(): boolean {
      return client !== null;
    },

    async parse(transcript: string, catalog: VoiceCatalogItem[]): Promise<VoiceCommandResult | null> {
      if (!client) return null;
      const raw = (transcript ?? "").trim();
      if (!raw) return null;

      const routes = catalog
        .filter((c) => c.actionType === "navigate" && c.route)
        .map((c) => `- ${c.id}: ${c.phrases[0]} → ${c.route}`)
        .slice(0, 20)
        .join("\n");

      const prompt =
        `Interpreta comando de voz para NELVYON SaaS. Devuelve SOLO JSON:\n` +
        `{"success":true,"actionType":"navigate|action|query|unknown","route":"/saas/...","action":"id_opcional","message":"frase corta ES"}\n\n` +
        `Rutas ejemplo:\n${routes}\n\nComando: ${raw}`;

      try {
        const out = await client.complete(prompt, {
          model: process.env.AUTONOMOUS_OPENAI_MODEL?.trim() || "gpt-4o-mini",
          maxTokens: 200,
          temperature: 0.1,
        });
        const parsed = JSON.parse(extractJson(out)) as {
          success?: boolean;
          actionType?: string;
          route?: string;
          action?: string;
          message?: string;
        };
        if (!parsed.success) return null;

        const actionTypes = ["navigate", "action", "query", "unknown"] as const;
        const actionType = actionTypes.includes(parsed.actionType as (typeof actionTypes)[number])
          ? (parsed.actionType as VoiceIntent["actionType"])
          : "unknown";

        const intent: VoiceIntent = {
          id: "llm_parse",
          actionType,
          route: parsed.route,
          action: parsed.action,
          description: parsed.message ?? "Comando de voz",
        };

        return {
          success: actionType !== "unknown",
          transcript: raw,
          intent: actionType === "unknown" ? null : intent,
          message: parsed.message ?? intent.description,
          route: parsed.route,
        };
      } catch {
        return null;
      }
    },
  };
}

/** Exported for tests — map LLM JSON without network */
export function mapLlmVoiceJson(
  transcript: string,
  parsed: { success?: boolean; actionType?: string; route?: string; action?: string; message?: string },
): VoiceCommandResult | null {
  if (!parsed.success) return null;
  const norm = normalizeTranscript(transcript);
  if (!norm) return null;
  const actionTypes = ["navigate", "action", "query"] as const;
  const actionType = actionTypes.includes(parsed.actionType as (typeof actionTypes)[number])
    ? (parsed.actionType as VoiceIntent["actionType"])
    : "unknown";
  if (actionType === "unknown") return null;
  const intent: VoiceIntent = {
    id: "llm_parse",
    actionType,
    route: parsed.route,
    action: parsed.action,
    description: parsed.message ?? "Comando de voz",
  };
  return {
    success: true,
    transcript,
    intent,
    message: parsed.message ?? intent.description,
    route: parsed.route,
  };
}
