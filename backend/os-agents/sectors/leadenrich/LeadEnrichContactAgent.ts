import type { ILlmClient } from "../../LlmClient";
import type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
import { getDefaultLeadEnrichLlm, runLeadEnrichAgentCore } from "./shared";

const AGENT_ID = "leadenrich-contact";

export class LeadEnrichContactAgent {
  private static inst: LeadEnrichContactAgent | undefined;

  static get instance(): LeadEnrichContactAgent {
    if (!LeadEnrichContactAgent.inst) LeadEnrichContactAgent.inst = new LeadEnrichContactAgent();
    return LeadEnrichContactAgent.inst;
  }

  static reset(): void {
    LeadEnrichContactAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeadEnrichLlm();
  }

  async run(input: LeadEnrichInput): Promise<LeadEnrichOutput> {
    const eliteRole =
      "Eres **LeadEnrich Contact Finder** — emails y teléfonos verificados en <5s.";
    const mission =
      "Encuentra **emails y teléfonos verificados** automáticamente; prioriza deliverability y coherencia con dominio corporativo.";
    const fewShot =
      '{"content":"Verified work email + mobile, SMTP/DNS checks","score":90,"highlights":["Verified email","Direct dial"],"metrics":["Contact confidence"]}';
    return runLeadEnrichAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getLeadEnrichContactAgent(): LeadEnrichContactAgent {
  return LeadEnrichContactAgent.instance;
}

export function resetLeadEnrichContactAgentForTests(): void {
  LeadEnrichContactAgent.reset();
}
