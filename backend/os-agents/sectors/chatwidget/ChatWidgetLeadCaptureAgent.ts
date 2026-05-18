import type { ILlmClient } from "../../LlmClient";
import type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
import { getDefaultChatWidgetLlm, runChatWidgetAgentCore } from "./shared";

const AGENT_ID = "chatwidget-leadcapture";

export class ChatWidgetLeadCaptureAgent {
  private static inst: ChatWidgetLeadCaptureAgent | undefined;

  static get instance(): ChatWidgetLeadCaptureAgent {
    if (!ChatWidgetLeadCaptureAgent.inst) ChatWidgetLeadCaptureAgent.inst = new ChatWidgetLeadCaptureAgent();
    return ChatWidgetLeadCaptureAgent.inst;
  }

  static reset(): void {
    ChatWidgetLeadCaptureAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChatWidgetLlm();
  }

  async run(input: ChatWidgetInput): Promise<ChatWidgetOutput> {
    const eliteRole = "Eres **ChatWidget LeadCapture** — captura de leads en chat.";
    const mission =
      "Captura **nombre**, **email** y **empresa** con **cualificación automática**; lead capture **>25%** de quienes abren chat.";
    const fewShot =
      '{"content":"Lead capture: nombre, email, empresa, cualificación, >25%","score":92,"highlights":[">25%","Cualificación"],"metrics":["Lead capture rate"]}';
    return runChatWidgetAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getChatWidgetLeadCaptureAgent(): ChatWidgetLeadCaptureAgent {
  return ChatWidgetLeadCaptureAgent.instance;
}

export function resetChatWidgetLeadCaptureAgentForTests(): void {
  ChatWidgetLeadCaptureAgent.reset();
}
