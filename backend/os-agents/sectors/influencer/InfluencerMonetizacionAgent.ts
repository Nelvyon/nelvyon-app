import type { ILlmClient } from "../../LlmClient";
import type { InfluencerInput, InfluencerOutput } from "./shared";
import { getDefaultInfluencerLlm, runInfluencerAgentCore } from "./shared";

const AGENT_ID = "influencer-monetizacion";

let inst: InfluencerMonetizacionAgent | null = null;

export class InfluencerMonetizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InfluencerMonetizacionAgent {
    if (!inst) inst = new InfluencerMonetizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerLlm();
  }

  async run(input: InfluencerInput): Promise<InfluencerOutput> {
    const eliteRole = "Eres **Influencer Monetización** — afiliados + sponsors.";
    const mission =
      "Define **estrategia monetización** (tiers sponsor, afiliados disclosure, productos digitales, pricing ético).";
    const fewShot =
      '{"result":"Ladder ingresos + checklist #ad","score":87,"recommendations":["Rate card","UTM afiliado","Impuestos placeholder"]}';
    return runInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInfluencerMonetizacionAgent(): InfluencerMonetizacionAgent {
  return InfluencerMonetizacionAgent.instance();
}

export function resetInfluencerMonetizacionAgentForTests(): void {
  inst = null;
}
