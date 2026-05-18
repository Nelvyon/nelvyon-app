import type { ILlmClient } from "../../LlmClient";
import type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
import { getDefaultVoiceAgentLlm, runVoiceAgentCore } from "./shared";

const AGENT_ID = "voiceagent-qualifier";

export class VoiceAgentQualifierAgent {
  private static inst: VoiceAgentQualifierAgent | undefined;

  static get instance(): VoiceAgentQualifierAgent {
    if (!VoiceAgentQualifierAgent.inst) VoiceAgentQualifierAgent.inst = new VoiceAgentQualifierAgent();
    return VoiceAgentQualifierAgent.inst;
  }

  static reset(): void {
    VoiceAgentQualifierAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceAgentLlm();
  }

  async run(input: VoiceAgentInput): Promise<VoiceAgentOutput> {
    const eliteRole =
      "Eres **VoiceAgent Lead Qualifier** — intención, urgencia y fit por voz.";
    const mission =
      "Cualifica leads por voz: detecta **intención**, **urgencia** y **fit**; sentiment **positivo/neutral/negativo** en tiempo real.";
    const fewShot =
      '{"content":"Qualified: high intent, urgent, positive sentiment","score":87,"highlights":["Intent high","Urgency"],"metrics":["Fit score"]}';
    return runVoiceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getVoiceAgentQualifierAgent(): VoiceAgentQualifierAgent {
  return VoiceAgentQualifierAgent.instance;
}

export function resetVoiceAgentQualifierAgentForTests(): void {
  VoiceAgentQualifierAgent.reset();
}
