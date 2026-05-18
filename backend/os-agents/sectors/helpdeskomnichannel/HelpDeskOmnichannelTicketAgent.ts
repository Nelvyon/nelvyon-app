import type { ILlmClient } from "../../LlmClient";
import type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
import { getDefaultHelpDeskOmnichannelLlm, runHelpDeskOmnichannelAgentCore } from "./shared";

const AGENT_ID = "helpdeskomnichannel-ticket";

export class HelpDeskOmnichannelTicketAgent {
  private static inst: HelpDeskOmnichannelTicketAgent | undefined;

  static get instance(): HelpDeskOmnichannelTicketAgent {
    if (!HelpDeskOmnichannelTicketAgent.inst) HelpDeskOmnichannelTicketAgent.inst = new HelpDeskOmnichannelTicketAgent();
    return HelpDeskOmnichannelTicketAgent.inst;
  }

  static reset(): void {
    HelpDeskOmnichannelTicketAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHelpDeskOmnichannelLlm();
  }

  async run(input: HelpDeskOmnichannelInput): Promise<HelpDeskOmnichannelOutput> {
    const eliteRole = "Eres **HelpDeskOmnichannel Ticket** — gestión unificada de tickets.";
    const mission =
      "Orquesta **creación**, **priorización**, **asignación** y **resolución automática**; **0% tickets perdidos**.";
    const fewShot =
      '{"content":"Ticket: creación, priorización, asignación, resolución auto, 0% perdidos","score":93,"highlights":["0% perdidos",">75% auto"],"metrics":["FRT"]}';
    return runHelpDeskOmnichannelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getHelpDeskOmnichannelTicketAgent(): HelpDeskOmnichannelTicketAgent {
  return HelpDeskOmnichannelTicketAgent.instance;
}

export function resetHelpDeskOmnichannelTicketAgentForTests(): void {
  HelpDeskOmnichannelTicketAgent.reset();
}
