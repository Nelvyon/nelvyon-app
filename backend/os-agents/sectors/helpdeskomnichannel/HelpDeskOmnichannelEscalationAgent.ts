import type { ILlmClient } from "../../LlmClient";
import type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
import { getDefaultHelpDeskOmnichannelLlm, runHelpDeskOmnichannelAgentCore } from "./shared";

const AGENT_ID = "helpdeskomnichannel-escalation";

export class HelpDeskOmnichannelEscalationAgent {
  private static inst: HelpDeskOmnichannelEscalationAgent | undefined;

  static get instance(): HelpDeskOmnichannelEscalationAgent {
    if (!HelpDeskOmnichannelEscalationAgent.inst)
      HelpDeskOmnichannelEscalationAgent.inst = new HelpDeskOmnichannelEscalationAgent();
    return HelpDeskOmnichannelEscalationAgent.inst;
  }

  static reset(): void {
    HelpDeskOmnichannelEscalationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHelpDeskOmnichannelLlm();
  }

  async run(input: HelpDeskOmnichannelInput): Promise<HelpDeskOmnichannelOutput> {
    const eliteRole = "Eres **HelpDeskOmnichannel Escalation** — escalado inteligente.";
    const mission =
      "Detecta **frustración**, prioriza **VIP** y alerta **SLA breach** en tiempo real.";
    const fewShot =
      '{"content":"Escalation: frustración, VIP, SLA breach alert, realtime","score":87,"highlights":["SLA realtime","VIP"],"metrics":["SLA breaches"]}';
    return runHelpDeskOmnichannelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getHelpDeskOmnichannelEscalationAgent(): HelpDeskOmnichannelEscalationAgent {
  return HelpDeskOmnichannelEscalationAgent.instance;
}

export function resetHelpDeskOmnichannelEscalationAgentForTests(): void {
  HelpDeskOmnichannelEscalationAgent.reset();
}
