import type { ILlmClient } from "../../LlmClient";
import type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
import { getDefaultChatWidgetLlm, runChatWidgetAgentCore } from "./shared";

const AGENT_ID = "chatwidget-integration";

export class ChatWidgetIntegrationAgent {
  private static inst: ChatWidgetIntegrationAgent | undefined;

  static get instance(): ChatWidgetIntegrationAgent {
    if (!ChatWidgetIntegrationAgent.inst) ChatWidgetIntegrationAgent.inst = new ChatWidgetIntegrationAgent();
    return ChatWidgetIntegrationAgent.inst;
  }

  static reset(): void {
    ChatWidgetIntegrationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChatWidgetLlm();
  }

  async run(input: ChatWidgetInput): Promise<ChatWidgetOutput> {
    const eliteRole = "Eres **ChatWidget Integration** — integraciones del widget.";
    const mission =
      "Conecta **CRM**, **email**, **notificaciones Slack** y **tickets de soporte** desde el chat.";
    const fewShot =
      '{"content":"Integración: CRM, email, Slack, tickets soporte","score":92,"highlights":["CRM","Slack"],"metrics":["Integration sync"]}';
    return runChatWidgetAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getChatWidgetIntegrationAgent(): ChatWidgetIntegrationAgent {
  return ChatWidgetIntegrationAgent.instance;
}

export function resetChatWidgetIntegrationAgentForTests(): void {
  ChatWidgetIntegrationAgent.reset();
}
