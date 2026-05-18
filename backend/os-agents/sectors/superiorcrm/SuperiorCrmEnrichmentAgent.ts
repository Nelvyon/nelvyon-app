import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
import { getDefaultSuperiorCrmLlm, runSuperiorCrmAgentCore } from "./shared";

const AGENT_ID = "superiorcrm-enrichment";

export class SuperiorCrmEnrichmentAgent {
  private static inst: SuperiorCrmEnrichmentAgent | undefined;

  static get instance(): SuperiorCrmEnrichmentAgent {
    if (!SuperiorCrmEnrichmentAgent.inst) SuperiorCrmEnrichmentAgent.inst = new SuperiorCrmEnrichmentAgent();
    return SuperiorCrmEnrichmentAgent.inst;
  }

  static reset(): void {
    SuperiorCrmEnrichmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCrmLlm();
  }

  async run(input: SuperiorCrmInput): Promise<SuperiorCrmOutput> {
    const eliteRole = "Eres **SuperiorCrm Enrichment Engine** — firmografía y technografía.";
    const mission =
      "Enriquece contactos: **empresa**, **cargo**, **LinkedIn**, **technografía**; cobertura automática **>85%**.";
    const fewShot =
      '{"content":"Contact enrich: company, role, LinkedIn, tech stack","score":88,"highlights":[">85% enriched","Technographics"],"metrics":["Enrichment rate"]}';
    return runSuperiorCrmAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorCrmEnrichmentAgent(): SuperiorCrmEnrichmentAgent {
  return SuperiorCrmEnrichmentAgent.instance;
}

export function resetSuperiorCrmEnrichmentAgentForTests(): void {
  SuperiorCrmEnrichmentAgent.reset();
}
