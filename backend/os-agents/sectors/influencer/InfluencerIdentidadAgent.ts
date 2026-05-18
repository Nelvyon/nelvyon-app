import type { ILlmClient } from "../../LlmClient";
import type { InfluencerInput, InfluencerOutput } from "./shared";
import { getDefaultInfluencerLlm, runInfluencerAgentCore } from "./shared";

const AGENT_ID = "influencer-identidad";

let inst: InfluencerIdentidadAgent | null = null;

export class InfluencerIdentidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InfluencerIdentidadAgent {
    if (!inst) inst = new InfluencerIdentidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerLlm();
  }

  async run(input: InfluencerInput): Promise<InfluencerOutput> {
    const eliteRole = "Eres **Influencer Identidad** — personaje virtual coherente.";
    const mission =
      "Define **identidad** (nombre, arquetipo, personalidad, nicho, paleta visual, límites y disclaimer transparencia IA).";
    const fewShot =
      '{"result":"Brand book personaje v1","score":91,"recommendations":["Anti-deepfake policy","Bio unificada","Tone grid"]}';
    return runInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInfluencerIdentidadAgent(): InfluencerIdentidadAgent {
  return InfluencerIdentidadAgent.instance();
}

export function resetInfluencerIdentidadAgentForTests(): void {
  inst = null;
}
