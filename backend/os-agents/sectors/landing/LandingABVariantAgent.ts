import type { ILlmClient } from "../../LlmClient";
import type { LandingInput, LandingOutput } from "./shared";
import { getDefaultLandingLlm, runLandingAgentCore } from "./shared";

const AGENT_ID = "landing-ab-variant";

export class LandingABVariantAgent {
  private static inst: LandingABVariantAgent | undefined;

  static get instance(): LandingABVariantAgent {
    if (!LandingABVariantAgent.inst) LandingABVariantAgent.inst = new LandingABVariantAgent();
    return LandingABVariantAgent.inst;
  }

  static reset(): void {
    LandingABVariantAgent.inst = undefined;
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
          "ROLE: Experimentación CRO top 1%; hipótesis claras por variante sin solaparse.",
        mission:
          "Genera 3 variantes A/B del hero (A control, B ángulo beneficio, C prueba social arriba) con headline/subhead/CTA.",
        fewShotExample:
          "Input: mismo producto tres ángulos. Output JSON: tabla 3 variantes; sections Hero A/B/C; ctaVariants alineadas.",
      },
      input,
    );
  }
}

export function getLandingABVariantAgent(): LandingABVariantAgent {
  return LandingABVariantAgent.instance;
}

export function resetLandingABVariantAgentForTests(): void {
  LandingABVariantAgent.reset();
}
