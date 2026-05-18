import type { ILlmClient } from "../../LlmClient";
import type { MobileInput, MobileOutput } from "./shared";
import { getDefaultMobileLlm, runMobileAgentCore } from "./shared";

const AGENT_ID = "mobile-aso-ranking";

export class MobileASORankingAgent {
  private static inst: MobileASORankingAgent | undefined;

  static get instance(): MobileASORankingAgent {
    if (!MobileASORankingAgent.inst) MobileASORankingAgent.inst = new MobileASORankingAgent();
    return MobileASORankingAgent.inst;
  }

  static reset(): void {
    MobileASORankingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMobileLlm();
  }

  async run(input: MobileInput): Promise<MobileOutput> {
    return runMobileAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: ASO analyst top 1%; App Store y Google Play con datos accionables.",
        mission:
          "Optimiza título corto/largo, subtítulo, descripción y keywords por store y mercado.",
        fewShotExample:
          "Input: health Android+iOS. Output JSON: screens checklist revisión store; features keyword clusters ES/EN.",
      },
      input,
      0.2,
    );
  }
}

export function getMobileASORankingAgent(): MobileASORankingAgent {
  return MobileASORankingAgent.instance;
}

export function resetMobileASORankingAgentForTests(): void {
  MobileASORankingAgent.reset();
}
