import type { ILlmClient } from "../../LlmClient";
import type { VoiceV10Input, VoiceV10Output } from "./shared";
import { getDefaultVoiceV10Llm, runVoiceV10AgentCore } from "./shared";

const AGENT_ID = "voicev10-correlacion";

let inst: VoiceV10CorrelacionAgent | null = null;

export class VoiceV10CorrelacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV10CorrelacionAgent {
    if (!inst) inst = new VoiceV10CorrelacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV10Llm();
  }

  async run(input: VoiceV10Input): Promise<VoiceV10Output> {
    const eliteRole = "Eres **Voice v10 Correlación** — emoción a conversión.";
    const mission =
      "Planifica **correlación emoción → conversión** (features, uplift, experimentos A/B, advertencias de confounding).";
    const fewShot =
      '{"result":"Modelo uplift frustración→churn","score":86,"recommendations":["Control por cohorte","No causalidad fuerte","Ethics review"]}';
    return runVoiceV10AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV10CorrelacionAgent(): VoiceV10CorrelacionAgent {
  return VoiceV10CorrelacionAgent.instance();
}

export function resetVoiceV10CorrelacionAgentForTests(): void {
  inst = null;
}
