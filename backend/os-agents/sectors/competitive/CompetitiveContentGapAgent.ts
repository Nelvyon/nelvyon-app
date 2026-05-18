import type { ILlmClient } from "../../LlmClient";
import type { CompetitiveInput, CompetitiveOutput } from "./shared";
import { getDefaultCompetitiveLlm, runCompetitiveAgentCore } from "./shared";

const AGENT_ID = "competitive-content-gap";

export class CompetitiveContentGapAgent {
  private static inst: CompetitiveContentGapAgent | undefined;

  static get instance(): CompetitiveContentGapAgent {
    if (!CompetitiveContentGapAgent.inst) {
      CompetitiveContentGapAgent.inst = new CompetitiveContentGapAgent();
    }
    return CompetitiveContentGapAgent.inst;
  }

  static reset(): void {
    CompetitiveContentGapAgent.inst = undefined;
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
          "ROLE: Director de contenido y SEO estratégico top 1%; detectas lagunas temáticas, formato y profundidad vs competidores.",
        mission:
          "Mapea temas/formatos que domina el competidor vs vacíos explotables; prioriza oportunidades de autoridad y conversión para la marca propia.",
        fewShotExample: `Input: eCommerce moda sostenible vs competidor con blog masivo de tendencias.
Output: JSON con calendarización sugerida (pilares, cluster, formato video vs longform), score 84, insights sobre guías de tallas, LCA y comparativas éticas.`,
      },
      input,
    );
  }
}

export function getCompetitiveContentGapAgent(): CompetitiveContentGapAgent {
  return CompetitiveContentGapAgent.instance;
}

export function resetCompetitiveContentGapAgentForTests(): void {
  CompetitiveContentGapAgent.reset();
}
