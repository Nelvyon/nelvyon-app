import type { ILlmClient } from "../../LlmClient";
import type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
import { getDefaultChatWidgetLlm, runChatWidgetAgentCore } from "./shared";

const AGENT_ID = "chatwidget-conversation";

export class ChatWidgetConversationAgent {
  private static inst: ChatWidgetConversationAgent | undefined;

  static get instance(): ChatWidgetConversationAgent {
    if (!ChatWidgetConversationAgent.inst) ChatWidgetConversationAgent.inst = new ChatWidgetConversationAgent();
    return ChatWidgetConversationAgent.inst;
  }

  static reset(): void {
    ChatWidgetConversationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChatWidgetLlm();
  }

  async run(input: ChatWidgetInput): Promise<ChatWidgetOutput> {
    const eliteRole = "Eres **ChatWidget Conversation** — conversaciones inteligentes en widget.";
    const mission =
      "Detecta **intención**, responde con **contexto** y gestiona **handoff humano**; respuesta automática **<2s**.";
    const fewShot =
      '{"content":"Conversation: intención, respuestas contextuales, handoff humano, <2s","score":93,"highlights":["<2s","Handoff"],"metrics":["Response latency"]}';
    return runChatWidgetAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getChatWidgetConversationAgent(): ChatWidgetConversationAgent {
  return ChatWidgetConversationAgent.instance;
}

export function resetChatWidgetConversationAgentForTests(): void {
  ChatWidgetConversationAgent.reset();
}
