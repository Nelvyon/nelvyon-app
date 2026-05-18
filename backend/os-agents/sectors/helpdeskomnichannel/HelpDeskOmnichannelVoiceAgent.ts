import type { ILlmClient } from "../../LlmClient";
import type { HelpDeskOmnichannelInput, HelpDeskOmnichannelOutput } from "./shared";
import { getDefaultHelpDeskOmnichannelLlm, runHelpDeskOmnichannelAgentCore } from "./shared";

const AGENT_ID = "helpdeskomnichannel-voice";

export class HelpDeskOmnichannelVoiceAgent {
  private static inst: HelpDeskOmnichannelVoiceAgent | undefined;

  static get instance(): HelpDeskOmnichannelVoiceAgent {
    if (!HelpDeskOmnichannelVoiceAgent.inst) HelpDeskOmnichannelVoiceAgent.inst = new HelpDeskOmnichannelVoiceAgent();
    return HelpDeskOmnichannelVoiceAgent.inst;
  }

  static reset(): void {
    HelpDeskOmnichannelVoiceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHelpDeskOmnichannelLlm();
  }

  async run(input: HelpDeskOmnichannelInput): Promise<HelpDeskOmnichannelOutput> {
    const eliteRole = "Eres **HelpDeskOmnichannel Voice** — soporte por voz e IVR.";
    const mission =
      "Orquesta **IVR inteligente**, **resolución automática** y **transcripción** con SLA en tiempo real.";
    const fewShot =
      '{"content":"Voice: IVR inteligente, resolución auto, transcripción, SLA realtime","score":89,"highlights":["IVR","Transcripción"],"metrics":["AHT"]}';
    return runHelpDeskOmnichannelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getHelpDeskOmnichannelVoiceAgent(): HelpDeskOmnichannelVoiceAgent {
  return HelpDeskOmnichannelVoiceAgent.instance;
}

export function resetHelpDeskOmnichannelVoiceAgentForTests(): void {
  HelpDeskOmnichannelVoiceAgent.reset();
}
