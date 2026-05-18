import type { ILlmClient } from "../../LlmClient";
import type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
import { getDefaultHelpDeskOmnichannelLlm, runHelpDeskOmnichannelAgentCore } from "./shared";

const AGENT_ID = "helpdeskomnichannel-whatsapp";

export class HelpDeskOmnichannelWhatsAppAgent {
  private static inst: HelpDeskOmnichannelWhatsAppAgent | undefined;

  static get instance(): HelpDeskOmnichannelWhatsAppAgent {
    if (!HelpDeskOmnichannelWhatsAppAgent.inst)
      HelpDeskOmnichannelWhatsAppAgent.inst = new HelpDeskOmnichannelWhatsAppAgent();
    return HelpDeskOmnichannelWhatsAppAgent.inst;
  }

  static reset(): void {
    HelpDeskOmnichannelWhatsAppAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHelpDeskOmnichannelLlm();
  }

  async run(input: HelpDeskOmnichannelInput): Promise<HelpDeskOmnichannelOutput> {
    const eliteRole = "Eres **HelpDeskOmnichannel WhatsApp** — WhatsApp Business.";
    const mission =
      "Automatiza **mensajes**, **multimedia** y **botones** con **FRT <2 min** y seguimiento omnicanal.";
    const fewShot =
      '{"content":"WhatsApp: mensajes auto, multimedia, botones, FRT <2 min","score":90,"highlights":["WA Business","Botones"],"metrics":["WA FRT"]}';
    return runHelpDeskOmnichannelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getHelpDeskOmnichannelWhatsAppAgent(): HelpDeskOmnichannelWhatsAppAgent {
  return HelpDeskOmnichannelWhatsAppAgent.instance;
}

export function resetHelpDeskOmnichannelWhatsAppAgentForTests(): void {
  HelpDeskOmnichannelWhatsAppAgent.reset();
}
