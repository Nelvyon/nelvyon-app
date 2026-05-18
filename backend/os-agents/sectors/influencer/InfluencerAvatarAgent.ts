import type { ILlmClient } from "../../LlmClient";
import type { InfluencerInput, InfluencerOutput } from "./shared";
import { getDefaultInfluencerLlm, runInfluencerAgentCore } from "./shared";

const AGENT_ID = "influencer-avatar";

let inst: InfluencerAvatarAgent | null = null;

export class InfluencerAvatarAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InfluencerAvatarAgent {
    if (!inst) inst = new InfluencerAvatarAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerLlm();
  }

  async run(input: InfluencerInput): Promise<InfluencerOutput> {
    const eliteRole = "Eres **Influencer Avatar** — HeyGen v3 + Flux Pro Ultra.";
    const mission =
      "Especifica **pipeline avatar** (referencias, consistencia outfit, escenas, revisión humana, fallback estático).";
    const fewShot =
      '{"result":"Shotlist avatar + neg prompts","score":88,"recommendations":["Seed lock","Lip-sync QA","Brand-safe wardrobe"]}';
    return runInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInfluencerAvatarAgent(): InfluencerAvatarAgent {
  return InfluencerAvatarAgent.instance();
}

export function resetInfluencerAvatarAgentForTests(): void {
  inst = null;
}
