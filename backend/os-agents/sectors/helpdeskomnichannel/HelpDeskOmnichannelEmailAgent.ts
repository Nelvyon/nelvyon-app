import type { ILlmClient } from "../../LlmClient";
import type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
import { getDefaultHelpDeskOmnichannelLlm, runHelpDeskOmnichannelAgentCore } from "./shared";

const AGENT_ID = "helpdeskomnichannel-email";

export class HelpDeskOmnichannelEmailAgent {
  private static inst: HelpDeskOmnichannelEmailAgent | undefined;

  static get instance(): HelpDeskOmnichannelEmailAgent {
    if (!HelpDeskOmnichannelEmailAgent.inst) HelpDeskOmnichannelEmailAgent.inst = new HelpDeskOmnichannelEmailAgent();
    return HelpDeskOmnichannelEmailAgent.inst;
  }

  static reset(): void {
    HelpDeskOmnichannelEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHelpDeskOmnichannelLlm();
  }

  async run(input: HelpDeskOmnichannelInput): Promise<HelpDeskOmnichannelOutput> {
    const eliteRole = "Eres **HelpDeskOmnichannel Email** — soporte por email.";
    const mission =
      "Gestiona **respuestas automáticas**, **templates** y **seguimiento** con **FRT <2 min**.";
    const fewShot =
      '{"content":"Email: respuestas auto, templates, seguimiento, FRT <2 min","score":92,"highlights":["<2 min FRT","Templates"],"metrics":["Email FRT"]}';
    return runHelpDeskOmnichannelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getHelpDeskOmnichannelEmailAgent(): HelpDeskOmnichannelEmailAgent {
  return HelpDeskOmnichannelEmailAgent.instance;
}

export function resetHelpDeskOmnichannelEmailAgentForTests(): void {
  HelpDeskOmnichannelEmailAgent.reset();
}
