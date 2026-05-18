import type { ILlmClient } from "../../LlmClient";
import type { CompetitiveInput, CompetitiveOutput } from "./shared";
import { getDefaultCompetitiveLlm, runCompetitiveAgentCore } from "./shared";

const AGENT_ID = "competitive-positioning-analyst";

export class CompetitivePositioningAnalystAgent {
  private static inst: CompetitivePositioningAnalystAgent | undefined;

  static get instance(): CompetitivePositioningAnalystAgent {
    if (!CompetitivePositioningAnalystAgent.inst) {
      CompetitivePositioningAnalystAgent.inst = new CompetitivePositioningAnalystAgent();
    }
    return CompetitivePositioningAnalystAgent.inst;
  }

  static reset(): void {
    CompetitivePositioningAnalystAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCompetitiveLlm();
  }

  async run(input: CompetitiveInput): Promise<CompetitiveOutput> {
    return runCompetitiveAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Eres estratega de posicionamiento de marca de élite (top 1%); combinas research competitivo, JTBD y mensajería diferencial.",
        mission:
          "Define matriz de posicionamiento (pilares, prueba, riesgo perceptual) vs el competidor y gaps que la marca propia puede ocupar sin diluir posicionamiento.",
        fewShotExample: `Input: SaaS CRM mid-market vs competidor enterprise genérico.
Output JSON: contenido con matriz Analyze/Compare/Tactical; score 88; insights sobre nicho "velocidad de implementación", testimonios técnicos y pricing transparente.`,
      },
      input,
    );
  }
}

export function getCompetitivePositioningAnalystAgent(): CompetitivePositioningAnalystAgent {
  return CompetitivePositioningAnalystAgent.instance;
}

export function resetCompetitivePositioningAnalystAgentForTests(): void {
  CompetitivePositioningAnalystAgent.reset();
}
