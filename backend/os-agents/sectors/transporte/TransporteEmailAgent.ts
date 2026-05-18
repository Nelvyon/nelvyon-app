import type { ILlmClient } from "../../LlmClient";
import type { TransporteInput, TransporteOutput } from "./shared";
import { getDefaultTransporteLlm, runTransporteAgentCore } from "./shared";

const AGENT_ID = "transporte-email";

let inst: TransporteEmailAgent | null = null;

export class TransporteEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): TransporteEmailAgent {
    if (!inst) inst = new TransporteEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTransporteLlm();
  }

  async run(input: TransporteInput): Promise<TransporteOutput> {
    const eliteRole = "Eres **Transporte Email** — envíos y fidelidad.";
    const mission =
      "Diseña **email de seguimiento de envíos** y **fidelización** (estados, upsell seguro, programa puntos).";
    const fewShot =
      '{"result":"Secuencia tracking + post-entrega NPS","score":91,"recommendations":["Trigger retraso","Win-back"]}';
    return runTransporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTransporteEmailAgent(): TransporteEmailAgent {
  return TransporteEmailAgent.instance();
}

export function resetTransporteEmailAgentForTests(): void {
  inst = null;
}
