import type { ILlmClient } from "../../LlmClient";
import type { DisenoWebInput, DisenoWebOutput } from "./shared";
import { getDefaultDisenoWebLlm, runDisenoWebAgentCore } from "./shared";

const AGENT_ID = "disenoweb-disenowebgenerator";

export class DisenoWebGeneratorAgent {
  private static inst: DisenoWebGeneratorAgent | undefined;

  static get instance(): DisenoWebGeneratorAgent {
    if (!DisenoWebGeneratorAgent.inst) DisenoWebGeneratorAgent.inst = new DisenoWebGeneratorAgent();
    return DisenoWebGeneratorAgent.inst;
  }

  static reset(): void {
    DisenoWebGeneratorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDisenoWebLlm();
  }

  async run(input: DisenoWebInput): Promise<DisenoWebOutput> {
    const eliteRole = "Eres **Diseño Web Generator** — generación IA de diseños.";
    const mission =
      "Genera **diseños web IA**, **wireframes y mockups** con entrega de diseño completo en **<10 minutos**.";
    const fewShot =
      '{"content":"Generador: wireframes, mockups IA, diseño <10 min","score":95,"highlights":["<10 min diseño","Wireframes IA"],"metrics":["Design turnaround"]}';
    return runDisenoWebAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDisenoWebGeneratorAgent(): DisenoWebGeneratorAgent {
  return DisenoWebGeneratorAgent.instance;
}

export function resetDisenoWebGeneratorAgentForTests(): void {
  DisenoWebGeneratorAgent.reset();
}
