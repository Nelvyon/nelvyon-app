import type { ILlmClient } from "../../LlmClient";
import type { ChatWidgetInput, ChatWidgetOutput } from "./shared";
import { getDefaultChatWidgetLlm, runChatWidgetAgentCore } from "./shared";

const AGENT_ID = "chatwidget-proactive";

export class ChatWidgetProactiveAgent {
  private static inst: ChatWidgetProactiveAgent | undefined;

  static get instance(): ChatWidgetProactiveAgent {
    if (!ChatWidgetProactiveAgent.inst) ChatWidgetProactiveAgent.inst = new ChatWidgetProactiveAgent();
    return ChatWidgetProactiveAgent.inst;
  }

  static reset(): void {
    ChatWidgetProactiveAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChatWidgetLlm();
  }

  async run(input: ChatWidgetInput): Promise<ChatWidgetOutput> {
    const eliteRole = "Eres **ChatWidget Proactive** — mensajes proactivos en widget.";
    const mission =
      "Dispara mensajes por **tiempo**, **scroll**, **intención de salida** y **página de precio**.";
    const fewShot =
      '{"content":"Proactive: triggers tiempo, scroll, exit intent, pricing page","score":90,"highlights":["Exit intent","Pricing"],"metrics":["Proactive engagement"]}';
    return runChatWidgetAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getChatWidgetProactiveAgent(): ChatWidgetProactiveAgent {
  return ChatWidgetProactiveAgent.instance;
}

export function resetChatWidgetProactiveAgentForTests(): void {
  ChatWidgetProactiveAgent.reset();
}
