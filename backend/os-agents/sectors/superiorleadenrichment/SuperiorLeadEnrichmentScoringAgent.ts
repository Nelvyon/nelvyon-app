import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
import { getDefaultSuperiorLeadEnrichmentLlm, runSuperiorLeadEnrichmentAgentCore } from "./shared";

const AGENT_ID = "superiorleadenrichment-scoring";

export class SuperiorLeadEnrichmentScoringAgent {
  private static inst: SuperiorLeadEnrichmentScoringAgent | undefined;

  static get instance(): SuperiorLeadEnrichmentScoringAgent {
    if (!SuperiorLeadEnrichmentScoringAgent.inst) SuperiorLeadEnrichmentScoringAgent.inst = new SuperiorLeadEnrichmentScoringAgent();
    return SuperiorLeadEnrichmentScoringAgent.inst;
  }

  static reset(): void {
    SuperiorLeadEnrichmentScoringAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLeadEnrichmentLlm();
  }

  async run(input: SuperiorLeadEnrichmentInput): Promise<SuperiorLeadEnrichmentOutput> {
    const eliteRole = "Eres **SuperiorLeadEnrichment Scoring** — scoring predictivo.";
    const mission =
      "Calcula **scoring multi-dimensional** e **ICP fit 0-100** con accuracy **>90%**.";
    const fewShot =
      '{"content":"Multi-dimensional predictive scoring ICP fit 0-100 >90% accuracy","score":91,"highlights":["ICP fit 0-100",">90% accuracy"],"metrics":["ICP scoring accuracy"]}';
    return runSuperiorLeadEnrichmentAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorLeadEnrichmentScoringAgent(): SuperiorLeadEnrichmentScoringAgent {
  return SuperiorLeadEnrichmentScoringAgent.instance;
}

export function resetSuperiorLeadEnrichmentScoringAgentForTests(): void {
  SuperiorLeadEnrichmentScoringAgent.reset();
}
