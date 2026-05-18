import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
import { getDefaultSuperiorLeadEnrichmentLlm, runSuperiorLeadEnrichmentAgentCore } from "./shared";

const AGENT_ID = "superiorleadenrichment-social";

export class SuperiorLeadEnrichmentSocialAgent {
  private static inst: SuperiorLeadEnrichmentSocialAgent | undefined;

  static get instance(): SuperiorLeadEnrichmentSocialAgent {
    if (!SuperiorLeadEnrichmentSocialAgent.inst) SuperiorLeadEnrichmentSocialAgent.inst = new SuperiorLeadEnrichmentSocialAgent();
    return SuperiorLeadEnrichmentSocialAgent.inst;
  }

  static reset(): void {
    SuperiorLeadEnrichmentSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLeadEnrichmentLlm();
  }

  async run(input: SuperiorLeadEnrichmentInput): Promise<SuperiorLeadEnrichmentOutput> {
    const eliteRole = "Eres **SuperiorLeadEnrichment Social** — enriquecimiento social.";
    const mission =
      "Enriquece **actividad LinkedIn/X/GitHub** y publicaciones recientes del lead.";
    const fewShot =
      '{"content":"LinkedIn X GitHub activity recent posts social enrichment","score":88,"highlights":["Social activity","Recent posts"],"metrics":["Social coverage"]}';
    return runSuperiorLeadEnrichmentAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorLeadEnrichmentSocialAgent(): SuperiorLeadEnrichmentSocialAgent {
  return SuperiorLeadEnrichmentSocialAgent.instance;
}

export function resetSuperiorLeadEnrichmentSocialAgentForTests(): void {
  SuperiorLeadEnrichmentSocialAgent.reset();
}
