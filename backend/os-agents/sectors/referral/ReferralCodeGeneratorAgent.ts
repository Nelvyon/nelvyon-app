import type { ILlmClient } from "../../LlmClient";
import type { ReferralInput, ReferralOutput } from "./shared";
import { getDefaultReferralLlm, runReferralAgentCore } from "./shared";

const AGENT_ID = "referral-code-generator";

export class ReferralCodeGeneratorAgent {
  private static inst: ReferralCodeGeneratorAgent | undefined;

  static get instance(): ReferralCodeGeneratorAgent {
    if (!ReferralCodeGeneratorAgent.inst) ReferralCodeGeneratorAgent.inst = new ReferralCodeGeneratorAgent();
    return ReferralCodeGeneratorAgent.inst;
  }

  static reset(): void {
    ReferralCodeGeneratorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultReferralLlm();
  }

  async run(input: ReferralInput): Promise<ReferralOutput> {
    return runReferralAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Growth engineer top 1%; códigos memorables y únicos por tenant.",
        mission:
          "Genera propuesta de código único por cliente (prefijo marca + sufijo verificable), reglas de colisión y formato URL.",
        fewShotExample:
          '{"content":"Prefijo NLV + hash corto 6 alfanum; único global por marca.","score":92,"highlights":["NLV-K9XQ2A único","Slug nelvyon.com/r/K9XQ2A"],"metrics":["Entropía sufijo 36^6","TTL código indefinido hasta rotación"]}',
      },
      input,
      0.3,
    );
  }
}

export function getReferralCodeGeneratorAgent(): ReferralCodeGeneratorAgent {
  return ReferralCodeGeneratorAgent.instance;
}

export function resetReferralCodeGeneratorAgentForTests(): void {
  ReferralCodeGeneratorAgent.reset();
}
