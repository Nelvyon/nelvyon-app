import type { ILlmClient } from "../../LlmClient";
import type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
import { getDefaultMultiIdiomaAutomaticoLlm, runMultiIdiomaAutomaticoAgentCore } from "./shared";

const AGENT_ID = "multiidiomaautomatico-legal";

export class MultiIdiomaLegalAgent {
  private static inst: MultiIdiomaLegalAgent | undefined;

  static get instance(): MultiIdiomaLegalAgent {
    if (!MultiIdiomaLegalAgent.inst) MultiIdiomaLegalAgent.inst = new MultiIdiomaLegalAgent();
    return MultiIdiomaLegalAgent.inst;
  }

  static reset(): void {
    MultiIdiomaLegalAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiIdiomaAutomaticoLlm();
  }

  async run(input: MultiIdiomaAutomaticoInput): Promise<MultiIdiomaAutomaticoOutput> {
    const eliteRole = "Eres **MultiIdioma Legal** — adaptación de textos legales por país.";
    const mission =
      "Adapta textos legales por jurisdicción: **GDPR**, **CCPA**, **términos locales** y cumplimiento regional.";
    const fewShot =
      '{"content":"Legal multiidioma: GDPR, CCPA, términos locales por país","score":95,"highlights":["GDPR","CCPA"],"metrics":["Legal compliance"]}';
    return runMultiIdiomaAutomaticoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getMultiIdiomaLegalAgent(): MultiIdiomaLegalAgent {
  return MultiIdiomaLegalAgent.instance;
}

export function resetMultiIdiomaLegalAgentForTests(): void {
  MultiIdiomaLegalAgent.reset();
}
