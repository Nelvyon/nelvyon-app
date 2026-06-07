/** Isolated chatbot config + KB wrapper — no live chatbot_service deploy */

import { runChatbotConfig } from "../agents/mockAgents";

export interface ChatbotBuildInput {
  brief: Record<string, unknown>;
  knowledge_base: Record<string, unknown>;
  strategy: Record<string, unknown>;
}

export function buildChatbotIsolated(input: ChatbotBuildInput) {
  const cfg = runChatbotConfig(input.brief, input.knowledge_base);
  return {
    ...cfg.config,
    isolated: true,
    production_deploy: false,
    service: "chatbot_service_mock_wrapper",
    system_prompt_preview: buildSystemPromptPreview(input.brief, input.strategy, input.knowledge_base),
  };
}

function buildSystemPromptPreview(
  brief: Record<string, unknown>,
  strategy: Record<string, unknown>,
  kb: Record<string, unknown>,
): string {
  const persona = (strategy.persona as { name?: string; tone?: string }) ?? {};
  const disclaimer = String(kb.disclaimer ?? "");
  return [
    `Bot: ${persona.name ?? brief.bot_name}`,
    `Tone: ${persona.tone ?? brief.tone}`,
    `Disclaimer: ${disclaimer}`,
    `FAQs: ${(kb.faqs as unknown[])?.length ?? 0}`,
  ].join(" | ");
}
