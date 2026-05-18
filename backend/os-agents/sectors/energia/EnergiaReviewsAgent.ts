import type { ILlmClient } from "../../LlmClient";
import type { EnergiaInput, EnergiaOutput } from "./shared";
import { getDefaultEnergiaLlm, runEnergiaAgentCore } from "./shared";

const AGENT_ID = "energia-reviews";

let inst: EnergiaReviewsAgent | null = null;

export class EnergiaReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): EnergiaReviewsAgent {
    if (!inst) inst = new EnergiaReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnergiaLlm();
  }

  async run(input: EnergiaInput): Promise<EnergiaOutput> {
    const eliteRole = "Eres **Energía Reviews** — reputación instalaciones.";
    const mission =
      "Diseña **reputación online y testimonios** de instalaciones (placas, aerotermia) y servicio postventa.";
    const fewShot =
      '{"result":"Playbook testimonios instalación","score":90,"recommendations":["Solicitud review D+7","Video obra"]}';
    return runEnergiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEnergiaReviewsAgent(): EnergiaReviewsAgent {
  return EnergiaReviewsAgent.instance();
}

export function resetEnergiaReviewsAgentForTests(): void {
  inst = null;
}
