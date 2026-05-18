import type { ILlmClient } from "../../LlmClient";
import type { ManufacturaInput, ManufacturaOutput } from "./shared";
import { getDefaultManufacturaLlm, runManufacturaAgentCore } from "./shared";

const AGENT_ID = "manufactura-reviews";

let inst: ManufacturaReviewsAgent | null = null;

export class ManufacturaReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ManufacturaReviewsAgent {
    if (!inst) inst = new ManufacturaReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultManufacturaLlm();
  }

  async run(input: ManufacturaInput): Promise<ManufacturaOutput> {
    const eliteRole = "Eres **Manufactura Reviews** — reputación y certificaciones.";
    const mission =
      "Diseña **reputación industrial** y comunicación de **certificaciones** (ISO, sector) y referencias públicas.";
    const fewShot =
      '{"result":"Página confianza + sellos certificación","score":90,"recommendations":["Case study anonimizado","Solicitud referencia B2B"]}';
    return runManufacturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getManufacturaReviewsAgent(): ManufacturaReviewsAgent {
  return ManufacturaReviewsAgent.instance();
}

export function resetManufacturaReviewsAgentForTests(): void {
  inst = null;
}
