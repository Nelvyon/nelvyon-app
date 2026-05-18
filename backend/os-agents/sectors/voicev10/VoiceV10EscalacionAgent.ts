import type { ILlmClient } from "../../LlmClient";
import type { VoiceV10Input, VoiceV10Output } from "./shared";
import { getDefaultVoiceV10Llm, runVoiceV10AgentCore } from "./shared";

const AGENT_ID = "voicev10-escalacion";

let inst: VoiceV10EscalacionAgent | null = null;

export class VoiceV10EscalacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV10EscalacionAgent {
    if (!inst) inst = new VoiceV10EscalacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV10Llm();
  }

  async run(input: VoiceV10Input): Promise<VoiceV10Output> {
    const eliteRole = "Eres **Voice v10 Escalación** — frustración umbral.";
    const mission =
      "Planifica **escalación automática a humano** si frustración supera umbral (histeresis, ventana, bundle emocional al agente).";
    const fewShot =
      '{"result":"Política umbral frustración","score":89,"recommendations":["2 de 3 turnos","Cooldown 60s","Script handoff"]}';
    return runVoiceV10AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV10EscalacionAgent(): VoiceV10EscalacionAgent {
  return VoiceV10EscalacionAgent.instance();
}

export function resetVoiceV10EscalacionAgentForTests(): void {
  inst = null;
}
