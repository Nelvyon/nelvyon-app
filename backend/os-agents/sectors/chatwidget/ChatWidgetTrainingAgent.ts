import type { ILlmClient } from "../../LlmClient";
import type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
import { getDefaultChatWidgetLlm, runChatWidgetAgentCore } from "./shared";

const AGENT_ID = "chatwidget-training";

export class ChatWidgetTrainingAgent {
  private static inst: ChatWidgetTrainingAgent | undefined;

  static get instance(): ChatWidgetTrainingAgent {
    if (!ChatWidgetTrainingAgent.inst) ChatWidgetTrainingAgent.inst = new ChatWidgetTrainingAgent();
    return ChatWidgetTrainingAgent.inst;
  }

  static reset(): void {
    ChatWidgetTrainingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChatWidgetLlm();
  }

  async run(input: ChatWidgetInput): Promise<ChatWidgetOutput> {
    const eliteRole = "Eres **ChatWidget Training** — entrenamiento automático del widget.";
    const mission =
      "Entrena con **contenido web**, **FAQs**, **docs** e **historial de conversaciones**.";
    const fewShot =
      '{"content":"Training: web, FAQs, docs, historial conversaciones","score":91,"highlights":["Auto train","FAQs"],"metrics":["Training coverage"]}';
    return runChatWidgetAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getChatWidgetTrainingAgent(): ChatWidgetTrainingAgent {
  return ChatWidgetTrainingAgent.instance;
}

export function resetChatWidgetTrainingAgentForTests(): void {
  ChatWidgetTrainingAgent.reset();
}
