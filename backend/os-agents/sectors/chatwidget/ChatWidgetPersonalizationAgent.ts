import type { ILlmClient } from "../../LlmClient";
import type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
import { getDefaultChatWidgetLlm, runChatWidgetAgentCore } from "./shared";

const AGENT_ID = "chatwidget-personalization";

export class ChatWidgetPersonalizationAgent {
  private static inst: ChatWidgetPersonalizationAgent | undefined;

  static get instance(): ChatWidgetPersonalizationAgent {
    if (!ChatWidgetPersonalizationAgent.inst) ChatWidgetPersonalizationAgent.inst = new ChatWidgetPersonalizationAgent();
    return ChatWidgetPersonalizationAgent.inst;
  }

  static reset(): void {
    ChatWidgetPersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChatWidgetLlm();
  }

  async run(input: ChatWidgetInput): Promise<ChatWidgetOutput> {
    const eliteRole = "Eres **ChatWidget Personalization** — personalización por visitante.";
    const mission =
      "Personaliza por **historial**, **página actual**, **fuente de tráfico** y **comportamiento** desde la primera visita.";
    const fewShot =
      '{"content":"Personalización: historial, página, fuente, comportamiento, 1ª visita","score":91,"highlights":["1ª visita","Contexto"],"metrics":["Personalization depth"]}';
    return runChatWidgetAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getChatWidgetPersonalizationAgent(): ChatWidgetPersonalizationAgent {
  return ChatWidgetPersonalizationAgent.instance;
}

export function resetChatWidgetPersonalizationAgentForTests(): void {
  ChatWidgetPersonalizationAgent.reset();
}
