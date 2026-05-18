import type { ILlmClient } from "../../LlmClient";
import type { TransporteInput, TransporteOutput } from "./shared";
import { getDefaultTransporteLlm, runTransporteAgentCore } from "./shared";

const AGENT_ID = "transporte-social";

let inst: TransporteSocialAgent | null = null;

export class TransporteSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): TransporteSocialAgent {
    if (!inst) inst = new TransporteSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTransporteLlm();
  }

  async run(input: TransporteInput): Promise<TransporteOutput> {
    const eliteRole = "Eres **Transporte Social** — confianza y operativa.";
    const mission =
      "Diseña **social media** que combine **confianza de marca** y **comunicación operativa** (retrasos, avisos).";
    const fewShot =
      '{"result":"Calendario mix reputación + tips envío","score":90,"recommendations":["Stories tracking","Crisis playbook"]}';
    return runTransporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTransporteSocialAgent(): TransporteSocialAgent {
  return TransporteSocialAgent.instance();
}

export function resetTransporteSocialAgentForTests(): void {
  inst = null;
}
