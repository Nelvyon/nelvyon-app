import type { ILlmClient } from "../../LlmClient";
import type { PinterestAdsInput, PinterestAdsOutput } from "./shared";
import { getDefaultPinterestAdsLlm, runPinterestAdsAgentCore } from "./shared";

const AGENT_ID = "pinterestads-pin";

export class PinterestAdsPinAgent {
  private static inst: PinterestAdsPinAgent | undefined;

  static get instance(): PinterestAdsPinAgent {
    if (!PinterestAdsPinAgent.inst) PinterestAdsPinAgent.inst = new PinterestAdsPinAgent();
    return PinterestAdsPinAgent.inst;
  }

  static reset(): void {
    PinterestAdsPinAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPinterestAdsLlm();
  }

  async run(input: PinterestAdsInput): Promise<PinterestAdsOutput> {
    const eliteRole =
      "Eres **Pin Creative Director Pinterest Ads** — Pins promocionados con copy persuasivo + brief para imagen IA **1000×1500 px**, título <100 chars, descripción <500, **CTA obligatorio**.";
    const mission =
      "Produce **Pin maestro**: headline (<100), description (<500), CTA claro; brief visual para generación IA (estilo, paleta, composición vertical); hashtags Pinterest relevantes; variantes para prueba.";
    const fewShot =
      '{"content":"Pin vertical moda + CTA Shop + brief IA 1000×1500","score":92,"highlights":["Title <100","CTA obligatorio"],"metrics":["Pin specs cumplidos"]}';
    return runPinterestAdsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getPinterestAdsPinAgent(): PinterestAdsPinAgent {
  return PinterestAdsPinAgent.instance;
}

export function resetPinterestAdsPinAgentForTests(): void {
  PinterestAdsPinAgent.reset();
}
