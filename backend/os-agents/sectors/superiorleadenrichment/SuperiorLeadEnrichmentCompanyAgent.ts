import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
import { getDefaultSuperiorLeadEnrichmentLlm, runSuperiorLeadEnrichmentAgentCore } from "./shared";

const AGENT_ID = "superiorleadenrichment-company";

export class SuperiorLeadEnrichmentCompanyAgent {
  private static inst: SuperiorLeadEnrichmentCompanyAgent | undefined;

  static get instance(): SuperiorLeadEnrichmentCompanyAgent {
    if (!SuperiorLeadEnrichmentCompanyAgent.inst) SuperiorLeadEnrichmentCompanyAgent.inst = new SuperiorLeadEnrichmentCompanyAgent();
    return SuperiorLeadEnrichmentCompanyAgent.inst;
  }

  static reset(): void {
    SuperiorLeadEnrichmentCompanyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLeadEnrichmentLlm();
  }

  async run(input: SuperiorLeadEnrichmentInput): Promise<SuperiorLeadEnrichmentOutput> {
    const eliteRole = "Eres **SuperiorLeadEnrichment Company** — datos de empresa.";
    const mission =
      "Enriquece **tamaño, sector, revenue, tecnografía y financiación** con actualización **<24h**.";
    const fewShot =
      '{"content":"Company size sector revenue technographics funding <24h freshness","score":89,"highlights":["Technographics","Funding signals"],"metrics":["Company coverage"]}';
    return runSuperiorLeadEnrichmentAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorLeadEnrichmentCompanyAgent(): SuperiorLeadEnrichmentCompanyAgent {
  return SuperiorLeadEnrichmentCompanyAgent.instance;
}

export function resetSuperiorLeadEnrichmentCompanyAgentForTests(): void {
  SuperiorLeadEnrichmentCompanyAgent.reset();
}
