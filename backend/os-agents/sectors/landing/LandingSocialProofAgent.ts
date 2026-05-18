import type { ILlmClient } from "../../LlmClient";
import type { LandingInput, LandingOutput } from "./shared";
import { getDefaultLandingLlm, runLandingAgentCore } from "./shared";

const AGENT_ID = "landing-social-proof";

export class LandingSocialProofAgent {
  private static inst: LandingSocialProofAgent | undefined;

  static get instance(): LandingSocialProofAgent {
    if (!LandingSocialProofAgent.inst) LandingSocialProofAgent.inst = new LandingSocialProofAgent();
    return LandingSocialProofAgent.inst;
  }

  static reset(): void {
    LandingSocialProofAgent.inst = undefined;
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
          "ROLE: Social proof designer top 1%; testimonios creíbles sin marcas inventadas.",
        mission:
          "Construye sección de testimonios, logos placeholder [CLIENTE], métricas agregadas y badges de confianza genéricos.",
        fewShotExample:
          "Input: B2B services. Output JSON: 3 testimonios rol+resultado; sections Prueba social; ctaVariants Ver casos.",
      },
      input,
    );
  }
}

export function getLandingSocialProofAgent(): LandingSocialProofAgent {
  return LandingSocialProofAgent.instance;
}

export function resetLandingSocialProofAgentForTests(): void {
  LandingSocialProofAgent.reset();
}
