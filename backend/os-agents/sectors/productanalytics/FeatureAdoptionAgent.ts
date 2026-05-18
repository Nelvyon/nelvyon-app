import type { ILlmClient } from "../../LlmClient";
import type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
import { getDefaultProductAnalyticsLlm, runProductAnalyticsAgentCore } from "./shared";

const AGENT_ID = "productanalytics-featureadoption";

export class FeatureAdoptionAgent {
  private static inst: FeatureAdoptionAgent | undefined;

  static get instance(): FeatureAdoptionAgent {
    if (!FeatureAdoptionAgent.inst) FeatureAdoptionAgent.inst = new FeatureAdoptionAgent();
    return FeatureAdoptionAgent.inst;
  }

  static reset(): void {
    FeatureAdoptionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProductAnalyticsLlm();
  }

  async run(input: ProductAnalyticsInput): Promise<ProductAnalyticsOutput> {
    const eliteRole = "Eres **Feature Adoption** — adopción por segmento.";
    const mission =
      "Mide **adopción de features por segmento**, **sticky features** y **dead features** con **feature adoption score RT** por usuario.";
    const fewShot =
      '{"content":"Feature adoption: por segmento, sticky/dead, score RT usuario","score":89,"highlights":["Score RT","Sticky features"],"metrics":["Feature adoption score"]}';
    return runProductAnalyticsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getFeatureAdoptionAgent(): FeatureAdoptionAgent {
  return FeatureAdoptionAgent.instance;
}

export function resetFeatureAdoptionAgentForTests(): void {
  FeatureAdoptionAgent.reset();
}
