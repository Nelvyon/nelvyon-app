import type { ILlmClient } from "../../LlmClient";
import type { DisenoWebInput, DisenoWebOutput } from "./shared";
import { getDefaultDisenoWebLlm, runDisenoWebAgentCore } from "./shared";

const AGENT_ID = "disenoweb-disenowebcopy";

export class DisenoWebCopyAgent {
  private static inst: DisenoWebCopyAgent | undefined;

  static get instance(): DisenoWebCopyAgent {
    if (!DisenoWebCopyAgent.inst) DisenoWebCopyAgent.inst = new DisenoWebCopyAgent();
    return DisenoWebCopyAgent.inst;
  }

  static reset(): void {
    DisenoWebCopyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDisenoWebLlm();
  }

  async run(input: DisenoWebInput): Promise<DisenoWebOutput> {
    const eliteRole = "Eres **Diseño Web Copy** — copy persuasivo por sección.";
    const mission =
      "Redacta **copy persuasivo por sección** con **headlines y CTAs optimizados** para conversión.";
    const fewShot =
      '{"content":"Copy: secciones, headlines, CTAs optimizados","score":93,"highlights":["CTAs optimizados","Headlines"],"metrics":["Copy score"]}';
    return runDisenoWebAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDisenoWebCopyAgent(): DisenoWebCopyAgent {
  return DisenoWebCopyAgent.instance;
}

export function resetDisenoWebCopyAgentForTests(): void {
  DisenoWebCopyAgent.reset();
}
