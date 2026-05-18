import type { ILlmClient } from "../../LlmClient";
import type { VoiceAgentInput, VoiceAgentOutput } from "./shared";
import { getDefaultVoiceAgentLlm, runVoiceAgentCore } from "./shared";

const AGENT_ID = "voiceagent-caller";

export class VoiceAgentCallerAgent {
  private static inst: VoiceAgentCallerAgent | undefined;

  static get instance(): VoiceAgentCallerAgent {
    if (!VoiceAgentCallerAgent.inst) VoiceAgentCallerAgent.inst = new VoiceAgentCallerAgent();
    return VoiceAgentCallerAgent.inst;
  }

  static reset(): void {
    VoiceAgentCallerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceAgentLlm();
  }

  async run(input: VoiceAgentInput): Promise<VoiceAgentOutput> {
    const eliteRole =
      "Eres **VoiceAgent Outbound Caller** — llamadas salientes automáticas en ventana horaria local.";
    const mission =
      "Realiza **llamadas automáticas salientes** a prospectos/clientes; ventana **09:00-20:00** local, duración objetivo **3-7 min** y consentimiento GDPR al inicio.";
    const fewShot =
      '{"content":"Outbound call placed, GDPR consent, 5m target duration","score":88,"highlights":["09-20 local","3-7 min"],"metrics":["Call placed"]}';
    return runVoiceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getVoiceAgentCallerAgent(): VoiceAgentCallerAgent {
  return VoiceAgentCallerAgent.instance;
}

export function resetVoiceAgentCallerAgentForTests(): void {
  VoiceAgentCallerAgent.reset();
}
