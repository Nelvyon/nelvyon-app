import type { ILlmClient } from "../../LlmClient";
import type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
import { getDefaultHelpDeskOmnichannelLlm, runHelpDeskOmnichannelAgentCore } from "./shared";

const AGENT_ID = "helpdeskomnichannel-analytics";

export class HelpDeskOmnichannelAnalyticsAgent {
  private static inst: HelpDeskOmnichannelAnalyticsAgent | undefined;

  static get instance(): HelpDeskOmnichannelAnalyticsAgent {
    if (!HelpDeskOmnichannelAnalyticsAgent.inst)
      HelpDeskOmnichannelAnalyticsAgent.inst = new HelpDeskOmnichannelAnalyticsAgent();
    return HelpDeskOmnichannelAnalyticsAgent.inst;
  }

  static reset(): void {
    HelpDeskOmnichannelAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHelpDeskOmnichannelLlm();
  }

  async run(input: HelpDeskOmnichannelInput): Promise<HelpDeskOmnichannelOutput> {
    const eliteRole = "Eres **HelpDeskOmnichannel Analytics** — analytics de soporte omnicanal.";
    const mission =
      "Mide **CSAT**, **FRT**, **FCR**, **AHT** y **NPS post-ticket** con SLA en tiempo real.";
    const fewShot =
      '{"content":"Analytics: CSAT, FRT, FCR, AHT, NPS post-ticket","score":88,"highlights":["CSAT >4.7","FRT"],"metrics":["CSAT"]}';
    return runHelpDeskOmnichannelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getHelpDeskOmnichannelAnalyticsAgent(): HelpDeskOmnichannelAnalyticsAgent {
  return HelpDeskOmnichannelAnalyticsAgent.instance;
}

export function resetHelpDeskOmnichannelAnalyticsAgentForTests(): void {
  HelpDeskOmnichannelAnalyticsAgent.reset();
}
