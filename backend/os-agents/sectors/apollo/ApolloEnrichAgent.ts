import type { ILlmClient } from "../../LlmClient";
import type { ApolloInput, ApolloOutput } from "./shared";
import { getDefaultApolloLlm, runApolloAgentCore } from "./shared";

const AGENT_ID = "apollo-enrich";

export class ApolloEnrichAgent {
  private static inst: ApolloEnrichAgent | undefined;

  static get instance(): ApolloEnrichAgent {
    if (!ApolloEnrichAgent.inst) ApolloEnrichAgent.inst = new ApolloEnrichAgent();
    return ApolloEnrichAgent.inst;
  }

  static reset(): void {
    ApolloEnrichAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultApolloLlm();
  }

  async run(input: ApolloInput): Promise<ApolloOutput> {
    const eliteRole =
      "Eres **Apollo.io Enrichment Specialist** — enriquecimiento de contactos con datos verificables y deduplicación.";
    const mission =
      "Define **pipeline de enriquecimiento**: email verificado, **LinkedIn**, **teléfono**, **empresa** y campos firmográficos; reglas de confianza y fallback manual.";
    const fewShot =
      '{"content":"Enrich email+LinkedIn+phone with confidence tiers","score":91,"highlights":["Verified email","Company match"],"metrics":["Enrich rate"]}';
    return runApolloAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getApolloEnrichAgent(): ApolloEnrichAgent {
  return ApolloEnrichAgent.instance;
}

export function resetApolloEnrichAgentForTests(): void {
  ApolloEnrichAgent.reset();
}
