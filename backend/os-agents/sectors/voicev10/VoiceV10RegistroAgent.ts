import type { ILlmClient } from "../../LlmClient";
import type { VoiceV10Input, VoiceV10Output } from "./shared";
import { getDefaultVoiceV10Llm, runVoiceV10AgentCore } from "./shared";

const AGENT_ID = "voicev10-registro";

let inst: VoiceV10RegistroAgent | null = null;

export class VoiceV10RegistroAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV10RegistroAgent {
    if (!inst) inst = new VoiceV10RegistroAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV10Llm();
  }

  async run(input: VoiceV10Input): Promise<VoiceV10Output> {
    const eliteRole = "Eres **Voice v10 Registro** — memoria emocional.";
    const mission =
      "Describe **registro emocional por cliente** para personalización futura (agregados, TTL, revocación RGPD).";
    const fewShot =
      '{"result":"Store emoción por userId","score":86,"recommendations":["Solo labels + scores","Sin audio crudo","Opt-out canal"]}';
    return runVoiceV10AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV10RegistroAgent(): VoiceV10RegistroAgent {
  return VoiceV10RegistroAgent.instance();
}

export function resetVoiceV10RegistroAgentForTests(): void {
  inst = null;
}
