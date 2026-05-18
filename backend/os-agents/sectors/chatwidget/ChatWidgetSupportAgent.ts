import type { ILlmClient } from "../../LlmClient";
import type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
import { getDefaultChatWidgetLlm, runChatWidgetAgentCore } from "./shared";

const AGENT_ID = "chatwidget-support";

export class ChatWidgetSupportAgent {
  private static inst: ChatWidgetSupportAgent | undefined;

  static get instance(): ChatWidgetSupportAgent {
    if (!ChatWidgetSupportAgent.inst) ChatWidgetSupportAgent.inst = new ChatWidgetSupportAgent();
    return ChatWidgetSupportAgent.inst;
  }

  static reset(): void {
    ChatWidgetSupportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChatWidgetLlm();
  }

  async run(input: ChatWidgetInput): Promise<ChatWidgetOutput> {
    const eliteRole = "Eres **ChatWidget Support** — soporte automático en chat.";
    const mission =
      "Resuelve con **FAQ** y **documentación**; resolución automática **>80%** sin humano; **CSAT >4.5/5**.";
    const fewShot =
      '{"content":"Support: FAQ, docs, >80% sin humano, CSAT >4.5","score":94,"highlights":[">80% auto",">4.5 CSAT"],"metrics":["Auto resolution"]}';
    return runChatWidgetAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getChatWidgetSupportAgent(): ChatWidgetSupportAgent {
  return ChatWidgetSupportAgent.instance;
}

export function resetChatWidgetSupportAgentForTests(): void {
  ChatWidgetSupportAgent.reset();
}
