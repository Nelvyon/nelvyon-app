import type { ILlmClient } from "../../LlmClient";
import type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
import { getDefaultHelpDeskOmnichannelLlm, runHelpDeskOmnichannelAgentCore } from "./shared";

const AGENT_ID = "helpdeskomnichannel-chat";

export class HelpDeskOmnichannelChatAgent {
  private static inst: HelpDeskOmnichannelChatAgent | undefined;

  static get instance(): HelpDeskOmnichannelChatAgent {
    if (!HelpDeskOmnichannelChatAgent.inst) HelpDeskOmnichannelChatAgent.inst = new HelpDeskOmnichannelChatAgent();
    return HelpDeskOmnichannelChatAgent.inst;
  }

  static reset(): void {
    HelpDeskOmnichannelChatAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHelpDeskOmnichannelLlm();
  }

  async run(input: HelpDeskOmnichannelInput): Promise<HelpDeskOmnichannelOutput> {
    const eliteRole = "Eres **HelpDeskOmnichannel Chat** — live chat omnicanal.";
    const mission =
      "Responde en **<30s**, escala con inteligencia y resuelve **>75%** sin humano; **CSAT >4.7/5**.";
    const fewShot =
      '{"content":"Chat: <30s, escalado inteligente, >75% auto, CSAT >4.7","score":91,"highlights":["<30s",">75% auto"],"metrics":["Chat CSAT"]}';
    return runHelpDeskOmnichannelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getHelpDeskOmnichannelChatAgent(): HelpDeskOmnichannelChatAgent {
  return HelpDeskOmnichannelChatAgent.instance;
}

export function resetHelpDeskOmnichannelChatAgentForTests(): void {
  HelpDeskOmnichannelChatAgent.reset();
}
