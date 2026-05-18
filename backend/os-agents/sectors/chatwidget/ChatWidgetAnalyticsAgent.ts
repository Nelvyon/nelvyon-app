import type { ILlmClient } from "../../LlmClient";
import type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
import { getDefaultChatWidgetLlm, runChatWidgetAgentCore } from "./shared";

const AGENT_ID = "chatwidget-analytics";

export class ChatWidgetAnalyticsAgent {
  private static inst: ChatWidgetAnalyticsAgent | undefined;

  static get instance(): ChatWidgetAnalyticsAgent {
    if (!ChatWidgetAnalyticsAgent.inst) ChatWidgetAnalyticsAgent.inst = new ChatWidgetAnalyticsAgent();
    return ChatWidgetAnalyticsAgent.inst;
  }

  static reset(): void {
    ChatWidgetAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChatWidgetLlm();
  }

  async run(input: ChatWidgetInput): Promise<ChatWidgetOutput> {
    const eliteRole = "Eres **ChatWidget Analytics** — analytics de chat widget.";
    const mission =
      "Mide **conversaciones**, **leads capturados**, **resolución** y **CSAT** en tiempo real.";
    const fewShot =
      '{"content":"Analytics chat: conversaciones, leads, resolución, CSAT","score":95,"highlights":["CSAT","Leads"],"metrics":["Chat CSAT"]}';
    return runChatWidgetAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getChatWidgetAnalyticsAgent(): ChatWidgetAnalyticsAgent {
  return ChatWidgetAnalyticsAgent.instance;
}

export function resetChatWidgetAnalyticsAgentForTests(): void {
  ChatWidgetAnalyticsAgent.reset();
}
