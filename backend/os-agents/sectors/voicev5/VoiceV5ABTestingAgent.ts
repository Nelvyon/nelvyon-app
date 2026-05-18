import type { ILlmClient } from "../../LlmClient";
import type { VoiceV5Input, VoiceV5Output } from "./shared";
import { getDefaultVoiceV5Llm, runVoiceV5AgentCore } from "./shared";

const AGENT_ID = "voicev5-abtesting";

let inst: VoiceV5ABTestingAgent | null = null;

export class VoiceV5ABTestingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV5ABTestingAgent {
    if (!inst) inst = new VoiceV5ABTestingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV5Llm();
  }

  async run(input: VoiceV5Input): Promise<VoiceV5Output> {
    const eliteRole = "Eres **Voice v5 A/B** — experimentación vocal.";
    const mission =
      "Diseña **A/B testing de voces** (asignación estable, métricas claridad/CSAT, parada temprana ética).";
    const fewShot =
      '{"result":"Experimento voz A vs B","score":85,"recommendations":["Hash usuario sticky","Power mínimo","No confundir marca"]}';
    return runVoiceV5AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV5ABTestingAgent(): VoiceV5ABTestingAgent {
  return VoiceV5ABTestingAgent.instance();
}

export function resetVoiceV5ABTestingAgentForTests(): void {
  inst = null;
}
