import type { ILlmClient } from "../../LlmClient";
import type { TransporteInput, TransporteOutput } from "./shared";
import { getDefaultTransporteLlm, runTransporteAgentCore } from "./shared";

const AGENT_ID = "transporte-reviews";

let inst: TransporteReviewsAgent | null = null;

export class TransporteReviewsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): TransporteReviewsAgent {
    if (!inst) inst = new TransporteReviewsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTransporteLlm();
  }

  async run(input: TransporteInput): Promise<TransporteOutput> {
    const eliteRole = "Eres **Transporte Reviews** — reputación e incidencias.";
    const mission =
      "Diseña **gestión de reputación** y **respuesta a incidencias** (retrasos, daños, reclamaciones públicas).";
    const fewShot =
      '{"result":"Macros respuesta + escalado","score":90,"recommendations":["SLA respuesta 2h","Compensación estándar"]}';
    return runTransporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTransporteReviewsAgent(): TransporteReviewsAgent {
  return TransporteReviewsAgent.instance();
}

export function resetTransporteReviewsAgentForTests(): void {
  inst = null;
}
