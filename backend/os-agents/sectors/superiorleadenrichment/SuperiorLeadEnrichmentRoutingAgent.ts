import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
import { getDefaultSuperiorLeadEnrichmentLlm, runSuperiorLeadEnrichmentAgentCore } from "./shared";

const AGENT_ID = "superiorleadenrichment-routing";

export class SuperiorLeadEnrichmentRoutingAgent {
  private static inst: SuperiorLeadEnrichmentRoutingAgent | undefined;

  static get instance(): SuperiorLeadEnrichmentRoutingAgent {
    if (!SuperiorLeadEnrichmentRoutingAgent.inst) SuperiorLeadEnrichmentRoutingAgent.inst = new SuperiorLeadEnrichmentRoutingAgent();
    return SuperiorLeadEnrichmentRoutingAgent.inst;
  }

  static reset(): void {
    SuperiorLeadEnrichmentRoutingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLeadEnrichmentLlm();
  }

  async run(input: SuperiorLeadEnrichmentInput): Promise<SuperiorLeadEnrichmentOutput> {
    const eliteRole = "Eres **SuperiorLeadEnrichment Routing** — routing automático.";
    const mission =
      "Enruta al **rep correcto** por territorio, sector y tamaño **sin intervención humana**.";
    const fewShot =
      '{"content":"Auto routing correct rep territory sector size no human intervention","score":90,"highlights":["Auto routing","Territory match"],"metrics":["Routing accuracy"]}';
    return runSuperiorLeadEnrichmentAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorLeadEnrichmentRoutingAgent(): SuperiorLeadEnrichmentRoutingAgent {
  return SuperiorLeadEnrichmentRoutingAgent.instance;
}

export function resetSuperiorLeadEnrichmentRoutingAgentForTests(): void {
  SuperiorLeadEnrichmentRoutingAgent.reset();
}
