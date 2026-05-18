import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
import { getDefaultSuperiorLeadEnrichmentLlm, runSuperiorLeadEnrichmentAgentCore } from "./shared";

const AGENT_ID = "superiorleadenrichment-profile";

export class SuperiorLeadEnrichmentProfileAgent {
  private static inst: SuperiorLeadEnrichmentProfileAgent | undefined;

  static get instance(): SuperiorLeadEnrichmentProfileAgent {
    if (!SuperiorLeadEnrichmentProfileAgent.inst) SuperiorLeadEnrichmentProfileAgent.inst = new SuperiorLeadEnrichmentProfileAgent();
    return SuperiorLeadEnrichmentProfileAgent.inst;
  }

  static reset(): void {
    SuperiorLeadEnrichmentProfileAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLeadEnrichmentLlm();
  }

  async run(input: SuperiorLeadEnrichmentInput): Promise<SuperiorLeadEnrichmentOutput> {
    const eliteRole = "Eres **SuperiorLeadEnrichment Profile** — perfil completo del lead.";
    const mission =
      "Enriquece **empresa, cargo, LinkedIn, email y teléfono**; enriquecimiento **<3s** y cobertura **>85%**.";
    const fewShot =
      '{"content":"Full profile company title LinkedIn email phone <3s >85% coverage","score":90,"highlights":["<3s enrichment",">85% fields"],"metrics":["Field coverage"]}';
    return runSuperiorLeadEnrichmentAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorLeadEnrichmentProfileAgent(): SuperiorLeadEnrichmentProfileAgent {
  return SuperiorLeadEnrichmentProfileAgent.instance;
}

export function resetSuperiorLeadEnrichmentProfileAgentForTests(): void {
  SuperiorLeadEnrichmentProfileAgent.reset();
}
