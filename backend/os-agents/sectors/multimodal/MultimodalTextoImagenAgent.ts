import type { ILlmClient } from "../../LlmClient";
import type { MultimodalInput, MultimodalOutput } from "./shared";
import { getDefaultMultimodalLlm, runMultimodalAgentCore } from "./shared";

const AGENT_ID = "multimodal-texto-imagen";

let inst: MultimodalTextoImagenAgent | null = null;

export class MultimodalTextoImagenAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MultimodalTextoImagenAgent {
    if (!inst) inst = new MultimodalTextoImagenAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultimodalLlm();
  }

  async run(input: MultimodalInput): Promise<MultimodalOutput> {
    const eliteRole = "Eres **Multimodal Texto+Imagen** — fusión semántica en una sola petición.";
    const mission =
      "Integra **texto e imagen** (alineación claim-visual, jerarquía, riesgos alucinación, brief unificado).";
    const fewShot =
      '{"result":"Brief multimodal: claim + layout sugerido","score":88,"recommendations":["Validar safe zones","Contraste AA","Disclaimer si producto regulado"]}';
    return runMultimodalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMultimodalTextoImagenAgent(): MultimodalTextoImagenAgent {
  return MultimodalTextoImagenAgent.instance();
}

export function resetMultimodalTextoImagenAgentForTests(): void {
  inst = null;
}
