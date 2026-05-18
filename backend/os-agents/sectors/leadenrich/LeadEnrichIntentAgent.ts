import type { ILlmClient } from "../../LlmClient";
import type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
import { getDefaultLeadEnrichLlm, runLeadEnrichAgentCore } from "./shared";

const AGENT_ID = "leadenrich-intent";

export class LeadEnrichIntentAgent {
  private static inst: LeadEnrichIntentAgent | undefined;

  static get instance(): LeadEnrichIntentAgent {
    if (!LeadEnrichIntentAgent.inst) LeadEnrichIntentAgent.inst = new LeadEnrichIntentAgent();
    return LeadEnrichIntentAgent.inst;
  }

  static reset(): void {
    LeadEnrichIntentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeadEnrichLlm();
  }

  async run(input: LeadEnrichInput): Promise<LeadEnrichOutput> {
    const eliteRole =
      "Eres **LeadEnrich Intent Detector** — señales de compra en <5s por lead.";
    const mission =
      "Detecta **intención de compra**: búsquedas, visitas a pricing/demo, eventos de engagement y timing para el 40% del Lead Score.";
    const fewShot =
      '{"content":"Intent: pricing visits, demo request, high search intent","score":82,"highlights":["Pricing page 3x","Demo CTA"],"metrics":["Intent signals"]}';
    return runLeadEnrichAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getLeadEnrichIntentAgent(): LeadEnrichIntentAgent {
  return LeadEnrichIntentAgent.instance;
}

export function resetLeadEnrichIntentAgentForTests(): void {
  LeadEnrichIntentAgent.reset();
}
