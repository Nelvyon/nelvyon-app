import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
import { getDefaultSuperiorLeadEnrichmentLlm, runSuperiorLeadEnrichmentAgentCore } from "./shared";

const AGENT_ID = "superiorleadenrichment-intent";

export class SuperiorLeadEnrichmentIntentAgent {
  private static inst: SuperiorLeadEnrichmentIntentAgent | undefined;

  static get instance(): SuperiorLeadEnrichmentIntentAgent {
    if (!SuperiorLeadEnrichmentIntentAgent.inst) SuperiorLeadEnrichmentIntentAgent.inst = new SuperiorLeadEnrichmentIntentAgent();
    return SuperiorLeadEnrichmentIntentAgent.inst;
  }

  static reset(): void {
    SuperiorLeadEnrichmentIntentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLeadEnrichmentLlm();
  }

  async run(input: SuperiorLeadEnrichmentInput): Promise<SuperiorLeadEnrichmentOutput> {
    const eliteRole = "Eres **SuperiorLeadEnrichment Intent** — señales de intención.";
    const mission =
      "Detecta **visitas web, búsquedas y contenido consumido** como señales de intención de compra.";
    const fewShot =
      '{"content":"Web visits searches content consumed buying intent signals","score":88,"highlights":["Intent signals","Content consumption"],"metrics":["Intent strength"]}';
    return runSuperiorLeadEnrichmentAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorLeadEnrichmentIntentAgent(): SuperiorLeadEnrichmentIntentAgent {
  return SuperiorLeadEnrichmentIntentAgent.instance;
}

export function resetSuperiorLeadEnrichmentIntentAgentForTests(): void {
  SuperiorLeadEnrichmentIntentAgent.reset();
}
