import type { ILlmClient } from "../../LlmClient";
import type { CompetitiveInput, CompetitiveOutput } from "./shared";
import { getDefaultCompetitiveLlm, runCompetitiveAgentCore } from "./shared";

const AGENT_ID = "competitive-backlink-profile";

export class CompetitiveBacklinkProfileAgent {
  private static inst: CompetitiveBacklinkProfileAgent | undefined;

  static get instance(): CompetitiveBacklinkProfileAgent {
    if (!CompetitiveBacklinkProfileAgent.inst) {
      CompetitiveBacklinkProfileAgent.inst = new CompetitiveBacklinkProfileAgent();
    }
    return CompetitiveBacklinkProfileAgent.inst;
  }

  static reset(): void {
    CompetitiveBacklinkProfileAgent.inst = undefined;
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
          "ROLE: SEO técnico y off-page senior top 1%; modelas perfiles de enlace típicos por vertical y tamaño.",
        mission:
          "Describe patrón de autoridad de enlace probable del competidor (tipos de dominios, co-citaciones, PR, partners) y plan para converger o diferenciar sin riesgo.",
        fewShotExample: `Input: Marca DTC belleza vs competidor con fuerte prensa lifestyle y afiliados cupón.
Output: JSON con clusters de fuentes, riesgos toxic patterns, score 80, insights sobre digital PR de ingredientes y estudios propios.`,
      },
      input,
    );
  }
}

export function getCompetitiveBacklinkProfileAgent(): CompetitiveBacklinkProfileAgent {
  return CompetitiveBacklinkProfileAgent.instance;
}

export function resetCompetitiveBacklinkProfileAgentForTests(): void {
  CompetitiveBacklinkProfileAgent.reset();
}
