import type { ILlmClient } from "../../LlmClient";
import type { VoiceV8Input, VoiceV8Output } from "./shared";
import { getDefaultVoiceV8Llm, runVoiceV8AgentCore } from "./shared";

const AGENT_ID = "voicev8-objeciones";

let inst: VoiceV8ObjecionesAgent | null = null;

export class VoiceV8ObjecionesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV8ObjecionesAgent {
    if (!inst) inst = new VoiceV8ObjecionesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV8Llm();
  }

  async run(input: VoiceV8Input): Promise<VoiceV8Output> {
    const eliteRole = "Eres **Voice v8 Objeciones** — efectividad.";
    const mission =
      "Describe **detección de objeciones** y **respuestas más efectivas** (cluster NLU, uplift por playbook, contraejemplos).";
    const fewShot =
      '{"result":"Mapa objeción→outcome","score":87,"recommendations":["Embeddings frases","A/B por cohorte","Human review sample"]}';
    return runVoiceV8AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV8ObjecionesAgent(): VoiceV8ObjecionesAgent {
  return VoiceV8ObjecionesAgent.instance();
}

export function resetVoiceV8ObjecionesAgentForTests(): void {
  inst = null;
}
