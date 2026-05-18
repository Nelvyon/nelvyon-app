import type { ILlmClient } from "../../LlmClient";
import type { InfluencerInput, InfluencerOutput } from "./shared";
import { getDefaultInfluencerLlm, runInfluencerAgentCore } from "./shared";

const AGENT_ID = "influencer-voz";

let inst: InfluencerVozAgent | null = null;

export class InfluencerVozAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InfluencerVozAgent {
    if (!inst) inst = new InfluencerVozAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerLlm();
  }

  async run(input: InfluencerInput): Promise<InfluencerOutput> {
    const eliteRole = "Eres **Influencer Voz** — ElevenLabs consistente.";
    const mission =
      "Define **guía de voz** (casting, léxico marca, SSML, variaciones emocionales controladas).";
    const fewShot =
      '{"result":"Voice sheet + muestras 3 tonos","score":87,"recommendations":["Pronunciación marca","Clon ethics","Backup voz"]}';
    return runInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInfluencerVozAgent(): InfluencerVozAgent {
  return InfluencerVozAgent.instance();
}

export function resetInfluencerVozAgentForTests(): void {
  inst = null;
}
