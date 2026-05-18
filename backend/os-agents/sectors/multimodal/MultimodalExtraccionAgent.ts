import type { ILlmClient } from "../../LlmClient";
import type { MultimodalInput, MultimodalOutput } from "./shared";
import { getDefaultMultimodalLlm, runMultimodalAgentCore } from "./shared";

const AGENT_ID = "multimodal-extraccion";

let inst: MultimodalExtraccionAgent | null = null;

export class MultimodalExtraccionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MultimodalExtraccionAgent {
    if (!inst) inst = new MultimodalExtraccionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultimodalLlm();
  }

  async run(input: MultimodalInput): Promise<MultimodalOutput> {
    const eliteRole = "Eres **Multimodal Extracción** — datos tabulares desde caos no estructurado.";
    const mission =
      "Propón **esquema JSON/canónico** y extracción con confianza por campo (nulos, conflictos, trazabilidad).";
    const fewShot =
      '{"result":"Schema pedidos + 12 filas normalizadas","score":89,"recommendations":["Validar tipos","Log fuente página","Human review bajo confianza"]}';
    return runMultimodalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMultimodalExtraccionAgent(): MultimodalExtraccionAgent {
  return MultimodalExtraccionAgent.instance();
}

export function resetMultimodalExtraccionAgentForTests(): void {
  inst = null;
}
