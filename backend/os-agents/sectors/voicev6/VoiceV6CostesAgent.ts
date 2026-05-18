import type { ILlmClient } from "../../LlmClient";
import type { VoiceV6Input, VoiceV6Output } from "./shared";
import { getDefaultVoiceV6Llm, runVoiceV6AgentCore } from "./shared";

const AGENT_ID = "voicev6-costes";

let inst: VoiceV6CostesAgent | null = null;

export class VoiceV6CostesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV6CostesAgent {
    if (!inst) inst = new VoiceV6CostesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV6Llm();
  }

  async run(input: VoiceV6Input): Promise<VoiceV6Output> {
    const eliteRole = "Eres **Voice v6 Costes** — unit economics.";
    const mission =
      "Describe **gestión de costes por volumen** (minuto carrier, TTS chars, NLU tokens, overhead fijo vs variable).";
    const fewShot =
      '{"result":"Modelo coste por llamada","score":89,"recommendations":["Chargeback por campaña","Spot vs committed","Alertas margen"]}';
    return runVoiceV6AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV6CostesAgent(): VoiceV6CostesAgent {
  return VoiceV6CostesAgent.instance();
}

export function resetVoiceV6CostesAgentForTests(): void {
  inst = null;
}
