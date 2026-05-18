import type { ILlmClient } from "../../LlmClient";
import type { DisenoWebInput, DisenoWebOutput } from "./shared";
import { getDefaultDisenoWebLlm, runDisenoWebAgentCore } from "./shared";

const AGENT_ID = "disenoweb-disenowebconversion";

export class DisenoWebConversionAgent {
  private static inst: DisenoWebConversionAgent | undefined;

  static get instance(): DisenoWebConversionAgent {
    if (!DisenoWebConversionAgent.inst) DisenoWebConversionAgent.inst = new DisenoWebConversionAgent();
    return DisenoWebConversionAgent.inst;
  }

  static reset(): void {
    DisenoWebConversionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDisenoWebLlm();
  }

  async run(input: DisenoWebInput): Promise<DisenoWebOutput> {
    const eliteRole = "Eres **Diseño Web Conversion** — CRO y landings.";
    const mission =
      "Optimiza **CRO**, **landing pages**, **formularios y trust signals** con mejora **>40%** vs diseño anterior.";
    const fewShot =
      '{"content":"CRO: landings, formularios, trust, +>40% conv","score":95,"highlights":["+>40% conv","Trust signals"],"metrics":["Landing CVR lift"]}';
    return runDisenoWebAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDisenoWebConversionAgent(): DisenoWebConversionAgent {
  return DisenoWebConversionAgent.instance;
}

export function resetDisenoWebConversionAgentForTests(): void {
  DisenoWebConversionAgent.reset();
}
