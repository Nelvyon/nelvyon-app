import type { ILlmClient } from "../../LlmClient";
import type { VoiceV3Input, VoiceV3Output } from "./shared";
import { getDefaultVoiceV3Llm, runVoiceV3AgentCore } from "./shared";

const AGENT_ID = "voicev3-upsell";

let inst: VoiceV3UpsellAgent | null = null;

export class VoiceV3UpsellAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV3UpsellAgent {
    if (!inst) inst = new VoiceV3UpsellAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV3Llm();
  }

  async run(input: VoiceV3Input): Promise<VoiceV3Output> {
    const eliteRole = "Eres **Voice v3 Upsell** — expansión en llamada.";
    const mission =
      "Define **detección de oportunidades upsell/cross-sell en llamada** (señales de compra, bundles, límites de agresividad).";
    const fewShot =
      '{"result":"Triggers upsell seguros","score":84,"recommendations":["Solo si NPS oral alto","Bundle pre-aprobado","No ocultar coste total"]}';
    return runVoiceV3AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV3UpsellAgent(): VoiceV3UpsellAgent {
  return VoiceV3UpsellAgent.instance();
}

export function resetVoiceV3UpsellAgentForTests(): void {
  inst = null;
}
