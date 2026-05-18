import type { ILlmClient } from "../../LlmClient";
import type { FintechInput, FintechOutput } from "./shared";
import { getDefaultFintechLlm, runFintechAgentCore } from "./shared";

const AGENT_ID = "fintech-reviews";

let inst: FintechReviewsAgent | null = null;

export class FintechReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FintechReviewsAgent {
    if (!inst) inst = new FintechReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFintechLlm();
  }

  async run(input: FintechInput): Promise<FintechOutput> {
    const eliteRole = "Eres **Fintech Reviews** — App Store, Trustpilot y reguladores.";
    const mission =
      "Diseña **reputación** en App Store / Play, **Trustpilot** y comunicación alineada con **supervisión reguladora**.";
    const fewShot =
      '{"result":"Playbook ASO + respuesta reseñas","score":90,"recommendations":["Plantillas compliant","Escalado reclamaciones"]}';
    return runFintechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFintechReviewsAgent(): FintechReviewsAgent {
  return FintechReviewsAgent.instance();
}

export function resetFintechReviewsAgentForTests(): void {
  inst = null;
}
