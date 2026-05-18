import type { ILlmClient } from "../../LlmClient";
import type { TransporteInput, TransporteOutput } from "./shared";
import { getDefaultTransporteLlm, runTransporteAgentCore } from "./shared";

const AGENT_ID = "transporte-seo";

let inst: TransporteSEOAgent | null = null;

export class TransporteSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): TransporteSEOAgent {
    if (!inst) inst = new TransporteSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTransporteLlm();
  }

  async run(input: TransporteInput): Promise<TransporteOutput> {
    const eliteRole = "Eres **Transporte SEO** — local y comparadores.";
    const mission =
      "Diseña **SEO local** (mapas, cobertura) y **visibilidad en comparadores** de envío, mudanza o VTC.";
    const fewShot =
      '{"result":"Landings por ciudad + cobertura","score":92,"recommendations":["FAQ plazos","Schema LocalBusiness"]}';
    return runTransporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTransporteSEOAgent(): TransporteSEOAgent {
  return TransporteSEOAgent.instance();
}

export function resetTransporteSEOAgentForTests(): void {
  inst = null;
}
