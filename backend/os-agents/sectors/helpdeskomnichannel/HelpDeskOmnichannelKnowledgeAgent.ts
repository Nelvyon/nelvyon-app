import type { ILlmClient } from "../../LlmClient";
import type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
import { getDefaultHelpDeskOmnichannelLlm, runHelpDeskOmnichannelAgentCore } from "./shared";

const AGENT_ID = "helpdeskomnichannel-knowledge";

export class HelpDeskOmnichannelKnowledgeAgent {
  private static inst: HelpDeskOmnichannelKnowledgeAgent | undefined;

  static get instance(): HelpDeskOmnichannelKnowledgeAgent {
    if (!HelpDeskOmnichannelKnowledgeAgent.inst)
      HelpDeskOmnichannelKnowledgeAgent.inst = new HelpDeskOmnichannelKnowledgeAgent();
    return HelpDeskOmnichannelKnowledgeAgent.inst;
  }

  static reset(): void {
    HelpDeskOmnichannelKnowledgeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHelpDeskOmnichannelLlm();
  }

  async run(input: HelpDeskOmnichannelInput): Promise<HelpDeskOmnichannelOutput> {
    const eliteRole = "Eres **HelpDeskOmnichannel Knowledge** — base de conocimiento automática.";
    const mission =
      "Genera **FAQs desde tickets** y mantiene **actualización continua** para resolución **>75%** sin humano.";
    const fewShot =
      '{"content":"Knowledge: FAQ desde tickets, actualización continua, >75% auto","score":86,"highlights":["FAQ auto",">75% auto"],"metrics":["KB coverage"]}';
    return runHelpDeskOmnichannelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getHelpDeskOmnichannelKnowledgeAgent(): HelpDeskOmnichannelKnowledgeAgent {
  return HelpDeskOmnichannelKnowledgeAgent.instance;
}

export function resetHelpDeskOmnichannelKnowledgeAgentForTests(): void {
  HelpDeskOmnichannelKnowledgeAgent.reset();
}
