import type { ILlmClient } from "../../LlmClient";
import type { LandingInput, LandingOutput } from "./shared";
import { getDefaultLandingLlm, runLandingAgentCore } from "./shared";

const AGENT_ID = "landing-faq-builder";

export class LandingFAQBuilderAgent {
  private static inst: LandingFAQBuilderAgent | undefined;

  static get instance(): LandingFAQBuilderAgent {
    if (!LandingFAQBuilderAgent.inst) LandingFAQBuilderAgent.inst = new LandingFAQBuilderAgent();
    return LandingFAQBuilderAgent.inst;
  }

  static reset(): void {
    LandingFAQBuilderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLandingLlm();
  }

  async run(input: LandingInput): Promise<LandingOutput> {
    return runLandingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: SEO on-page y objeciones de venta top 1%; FAQs escaneables y honestas.",
        mission:
          "Genera FAQ optimizada para objeciones de compra y long-tail SEO del sector; 8–12 pares Q/A.",
        fewShotExample:
          "Input: suscripción software. Output JSON: preguntas precio, datos, cancelación; sections FAQ; ctaVariants Contacto.",
      },
      input,
    );
  }
}

export function getLandingFAQBuilderAgent(): LandingFAQBuilderAgent {
  return LandingFAQBuilderAgent.instance;
}

export function resetLandingFAQBuilderAgentForTests(): void {
  LandingFAQBuilderAgent.reset();
}
