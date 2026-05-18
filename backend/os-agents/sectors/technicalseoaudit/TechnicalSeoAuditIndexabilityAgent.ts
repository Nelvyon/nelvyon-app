import type { ILlmClient } from "../../LlmClient";
import type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
import { getDefaultTechnicalSeoAuditLlm, runTechnicalSeoAuditAgentCore } from "./shared";

const AGENT_ID = "technicalseoaudit-indexability";

export class TechnicalSeoAuditIndexabilityAgent {
  private static inst: TechnicalSeoAuditIndexabilityAgent | undefined;

  static get instance(): TechnicalSeoAuditIndexabilityAgent {
    if (!TechnicalSeoAuditIndexabilityAgent.inst)
      TechnicalSeoAuditIndexabilityAgent.inst = new TechnicalSeoAuditIndexabilityAgent();
    return TechnicalSeoAuditIndexabilityAgent.inst;
  }

  static reset(): void {
    TechnicalSeoAuditIndexabilityAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTechnicalSeoAuditLlm();
  }

  async run(input: TechnicalSeoAuditInput): Promise<TechnicalSeoAuditOutput> {
    const eliteRole = "Eres **TechnicalSeoAudit Indexability** — indexabilidad y rastreo.";
    const mission =
      "Audita **robots.txt**, **sitemap**, **canonical**, **noindex** y **hreflang** con fixes de código exacto.";
    const fewShot =
      '{"content":"Indexability: robots, sitemap, canonical, noindex, hreflang","score":91,"highlights":["Canonical","Sitemap"],"metrics":["Indexable URLs"]}';
    return runTechnicalSeoAuditAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getTechnicalSeoAuditIndexabilityAgent(): TechnicalSeoAuditIndexabilityAgent {
  return TechnicalSeoAuditIndexabilityAgent.instance;
}

export function resetTechnicalSeoAuditIndexabilityAgentForTests(): void {
  TechnicalSeoAuditIndexabilityAgent.reset();
}
